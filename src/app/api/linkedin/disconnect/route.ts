import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { disconnectLinkedInAccount } from "@/lib/linkedin";
import { getErrorMessage } from "@/lib/utils";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectLinkedInAccount(currentUser.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to disconnect LinkedIn") },
      { status: 500 }
    );
  }
}
