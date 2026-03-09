import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type LinkedInTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

type LinkedInUserInfo = {
  sub?: string;
  name?: string;
  email?: string;
};

type LinkedInSocialActionResponse = {
  likesSummary?: {
    totalLikes?: number;
    count?: number;
  };
  commentsSummary?: {
    totalFirstLevelComments?: number;
    count?: number;
  };
  totalSocialActivityCounts?: {
    numLikes?: number;
    numComments?: number;
  };
  impressionSummary?: {
    uniqueImpressionsCount?: number;
    impressionCount?: number;
  };
};

type LinkedInAccountRecord = {
  id: string;
  linkedin_member_id: string | null;
  linkedin_profile_name: string | null;
  linkedin_access_token: string | null;
  linkedin_refresh_token: string | null;
  linkedin_token_expires_at: string | null;
  linkedin_auto_publish_enabled: boolean | null;
};

const LINKEDIN_SCOPE = "openid profile email w_member_social offline_access";

function requireLinkedInEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required LinkedIn environment variable: ${name}`);
  }

  return value;
}

export function getLinkedInRedirectUri() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL for LinkedIn OAuth.");
  }

  return `${appUrl}/api/linkedin/callback`;
}

export function getLinkedInAuthorizationUrl(state: string) {
  const clientId = requireLinkedInEnv("LINKEDIN_CLIENT_ID");
  const redirectUri = getLinkedInRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: LINKEDIN_SCOPE,
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

async function exchangeCodeForToken(code: string) {
  const clientId = requireLinkedInEnv("LINKEDIN_CLIENT_ID");
  const clientSecret = requireLinkedInEnv("LINKEDIN_CLIENT_SECRET");
  const redirectUri = getLinkedInRedirectUri();
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }

  return (await response.json()) as LinkedInTokenResponse;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = requireLinkedInEnv("LINKEDIN_CLIENT_ID");
  const clientSecret = requireLinkedInEnv("LINKEDIN_CLIENT_SECRET");
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token refresh failed: ${error}`);
  }

  return (await response.json()) as LinkedInTokenResponse;
}

async function getLinkedInUserInfo(accessToken: string) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch LinkedIn profile: ${error}`);
  }

  return (await response.json()) as LinkedInUserInfo;
}

function expirationTimestamp(expiresIn?: number) {
  if (!expiresIn) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function connectLinkedInAccount(userId: string, code: string) {
  const tokenResponse = await exchangeCodeForToken(code);

  if (!tokenResponse.access_token) {
    throw new Error("LinkedIn did not return an access token.");
  }

  const userInfo = await getLinkedInUserInfo(tokenResponse.access_token);

  if (!userInfo.sub) {
    throw new Error("LinkedIn did not return a member identifier.");
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("users")
    .update({
      linkedin_member_id: userInfo.sub,
      linkedin_profile_name: userInfo.name ?? null,
      linkedin_access_token: tokenResponse.access_token,
      linkedin_refresh_token: tokenResponse.refresh_token ?? null,
      linkedin_token_expires_at: expirationTimestamp(tokenResponse.expires_in),
      linkedin_connected_at: new Date().toISOString(),
      linkedin_auto_publish_enabled: true,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    memberId: userInfo.sub,
    name: userInfo.name ?? null,
  };
}

export async function disconnectLinkedInAccount(userId: string) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("users")
    .update({
      linkedin_member_id: null,
      linkedin_profile_name: null,
      linkedin_access_token: null,
      linkedin_refresh_token: null,
      linkedin_token_expires_at: null,
      linkedin_connected_at: null,
      linkedin_auto_publish_enabled: false,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getLinkedInConnection(userId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, linkedin_member_id, linkedin_profile_name, linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at, linkedin_auto_publish_enabled"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as LinkedInAccountRecord | null) ?? null;
}

export async function ensureLinkedInAccessToken(userId: string) {
  const account = await getLinkedInConnection(userId);

  if (!account?.linkedin_member_id || !account.linkedin_access_token) {
    throw new Error("Connect a LinkedIn account before publishing posts.");
  }

  const expiresAt = account.linkedin_token_expires_at
    ? new Date(account.linkedin_token_expires_at).getTime()
    : null;
  const isExpired = expiresAt !== null && expiresAt <= Date.now() + 60_000;

  if (!isExpired) {
    return {
      accessToken: account.linkedin_access_token,
      memberId: account.linkedin_member_id,
      profileName: account.linkedin_profile_name,
      autoPublishEnabled: account.linkedin_auto_publish_enabled ?? true,
    };
  }

  if (!account.linkedin_refresh_token) {
    throw new Error("LinkedIn token expired. Reconnect your account.");
  }

  const refreshedToken = await refreshAccessToken(account.linkedin_refresh_token);

  if (!refreshedToken.access_token) {
    throw new Error("LinkedIn did not return a refreshed access token.");
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("users")
    .update({
      linkedin_access_token: refreshedToken.access_token,
      linkedin_refresh_token:
        refreshedToken.refresh_token ?? account.linkedin_refresh_token,
      linkedin_token_expires_at: expirationTimestamp(refreshedToken.expires_in),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    accessToken: refreshedToken.access_token,
    memberId: account.linkedin_member_id,
    profileName: account.linkedin_profile_name,
    autoPublishEnabled: account.linkedin_auto_publish_enabled ?? true,
  };
}

function normalizeLinkedInPostId(linkedInPostId: string) {
  return linkedInPostId.startsWith("urn:")
    ? linkedInPostId
    : `urn:li:ugcPost:${linkedInPostId}`;
}

function createLinkedInPostUrl(linkedInPostId: string | null) {
  if (!linkedInPostId) {
    return null;
  }

  return `https://www.linkedin.com/feed/update/${normalizeLinkedInPostId(linkedInPostId)}/`;
}

function parseLinkedInSocialMetrics(response: LinkedInSocialActionResponse) {
  const reactions =
    response.likesSummary?.totalLikes ??
    response.likesSummary?.count ??
    response.totalSocialActivityCounts?.numLikes ??
    0;
  const comments =
    response.commentsSummary?.totalFirstLevelComments ??
    response.commentsSummary?.count ??
    response.totalSocialActivityCounts?.numComments ??
    0;
  const impressions =
    response.impressionSummary?.uniqueImpressionsCount ??
    response.impressionSummary?.impressionCount ??
    null;
  const engagementRate =
    impressions && impressions > 0
      ? Number((((reactions + comments) / impressions) * 100).toFixed(2))
      : null;

  return {
    reactions,
    comments,
    impressions,
    engagementRate,
  };
}

export async function getLinkedInPostAnalytics({
  userId,
  linkedInPostId,
}: {
  userId: string;
  linkedInPostId: string;
}) {
  const account = await ensureLinkedInAccessToken(userId);
  const encodedUrn = encodeURIComponent(normalizeLinkedInPostId(linkedInPostId));
  const response = await fetch(`https://api.linkedin.com/rest/socialActions/${encodedUrn}`, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn analytics fetch failed: ${error}`);
  }

  const data = (await response.json()) as LinkedInSocialActionResponse;

  return parseLinkedInSocialMetrics(data);
}

export async function publishToLinkedIn({
  userId,
  content,
}: {
  userId: string;
  content: string;
}) {
  try {
    const account = await ensureLinkedInAccessToken(userId);

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202405",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.memberId}`,
        commentary: content,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn publish failed: ${error}`);
    }

    const linkedInPostId = response.headers.get("x-restli-id");

    return {
      linkedInPostId,
      postUrl: createLinkedInPostUrl(linkedInPostId),
      profileName: account.profileName,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to publish to LinkedIn."));
  }
}
