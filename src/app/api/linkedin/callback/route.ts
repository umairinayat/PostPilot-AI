import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectLinkedInAccount } from "@/lib/linkedin";
import { getErrorMessage } from "@/lib/utils";

type OAuthCookieValue = {
  state: string;
  userId: string;
};

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const cookieStore = await cookies();
    const oauthCookie = cookieStore.get("postpilot_linkedin_oauth")?.value;

    if (!oauthCookie) {
      throw new Error("LinkedIn authorization state was not found.");
    }

    let parsedCookie: OAuthCookieValue;

    try {
      parsedCookie = JSON.parse(oauthCookie) as OAuthCookieValue;
    } catch {
      throw new Error("LinkedIn authorization state was malformed.");
    }

    if (!code || !state || state !== parsedCookie.state) {
      throw new Error("LinkedIn authorization could not be verified.");
    }

    await connectLinkedInAccount(parsedCookie.userId, code);

    const response = NextResponse.redirect(`${appUrl}/app/settings?linkedin=connected`);
    response.cookies.delete("postpilot_linkedin_oauth");
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      `${appUrl}/app/settings?linkedin_error=${encodeURIComponent(
        getErrorMessage(error, "Failed to connect LinkedIn account")
      )}`
    );
    response.cookies.delete("postpilot_linkedin_oauth");
    return response;
  }
}
