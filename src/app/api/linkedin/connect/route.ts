import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLinkedInAuthorizationUrl } from "@/lib/linkedin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = crypto.randomUUID();
    const redirectUrl = getLinkedInAuthorizationUrl(state);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(
      "postpilot_linkedin_oauth",
      JSON.stringify({ state, userId: currentUser.id }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
      }
    );

    return response;
  } catch (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/app/settings?linkedin_error=${encodeURIComponent(
        getErrorMessage(error, "Failed to start LinkedIn connection")
      )}`
    );
  }
}
