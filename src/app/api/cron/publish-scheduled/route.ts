import { NextRequest, NextResponse } from "next/server";
import { publishToLinkedIn } from "@/lib/linkedin";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type ScheduledPostRecord = {
  id: string;
  user_id: string;
  content: string;
  scheduled_at: string | null;
};

type UserConnectionRecord = {
  linkedin_member_id: string | null;
  linkedin_access_token: string | null;
  linkedin_auto_publish_enabled: boolean | null;
};

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = req.headers.get("authorization");

    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, content, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(25);

    if (error) {
      throw new Error(error.message);
    }

    const duePosts = (data as ScheduledPostRecord[] | null) ?? [];
    let publishedCount = 0;
    const skipped: string[] = [];

    // Batch-fetch all users needed for due posts to avoid N+1 queries
    const uniqueUserIds = [...new Set(duePosts.map((p) => p.user_id))];
    const userMap = new Map<string, UserConnectionRecord>();

    if (uniqueUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, linkedin_member_id, linkedin_access_token, linkedin_auto_publish_enabled")
        .in("id", uniqueUserIds);

      if (!usersError && users) {
        for (const user of users) {
          const typedUser = user as UserConnectionRecord & { id: string };
          userMap.set(typedUser.id, typedUser);
        }
      }
    }

    for (const post of duePosts) {
      const connection = userMap.get(post.user_id) ?? null;

      if (
        !connection?.linkedin_member_id ||
        !connection.linkedin_access_token ||
        connection.linkedin_auto_publish_enabled === false
      ) {
        skipped.push(post.id);
        continue;
      }

      try {
        const result = await publishToLinkedIn({ userId: post.user_id, content: post.content });
        await supabase
          .from("posts")


          .update({
            status: "published",
            linkedin_post_id: result.linkedInPostId,
            published_url: result.postUrl,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);
        publishedCount += 1;
      } catch (publishError) {
        console.error(`Failed to publish post ${post.id}:`, publishError);
        skipped.push(post.id);
      }
    }

    return NextResponse.json({ publishedCount, skipped });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Scheduled publish run failed") },
      { status: 500 }
    );
  }
}
