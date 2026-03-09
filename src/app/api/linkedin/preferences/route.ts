import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";

type LinkedInPreferencesBody = {
  autoPublishEnabled?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as LinkedInPreferencesBody;

    if (typeof body.autoPublishEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoPublishEnabled must be a boolean" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("users")
      .update({ linkedin_auto_publish_enabled: body.autoPublishEnabled })
      .eq("id", currentUser.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, autoPublishEnabled: body.autoPublishEnabled });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update LinkedIn preferences") },
      { status: 500 }
    );
  }
}
