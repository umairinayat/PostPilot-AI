import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLinkedInConnection } from "@/lib/linkedin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getLinkedInConnection(currentUser.id);

    return NextResponse.json({
      connected: Boolean(account?.linkedin_member_id && account.linkedin_access_token),
      profileName: account?.linkedin_profile_name ?? null,
      autoPublishEnabled: account?.linkedin_auto_publish_enabled ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load LinkedIn status") },
      { status: 500 }
    );
  }
}
