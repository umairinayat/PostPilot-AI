import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { improvePostDraft } from "@/lib/openrouter";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/utils";

type ImprovePostBody = {
  content?: string;
  topic?: string;
  tone?: string;
};

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ImprovePostBody;
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Draft content is required" },
        { status: 400 }
      );
    }

    const rateLimit = await enforceRateLimit({
      userId: currentUser.id,
      routeKey: "posts_improve",
      limit: currentUser.plan === "free" ? 15 : 90,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit reached for AI improvements. Please wait and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (content.length > 6000) {
      return NextResponse.json(
        { error: "Draft is too long. Keep it under 6000 characters." },
        { status: 400 }
      );
    }

    const model =
      currentUser.plan === "free"
        ? "anthropic/claude-3-haiku"
        : "anthropic/claude-3.5-sonnet";

    const result = await improvePostDraft({
      content,
      tone: body.tone,
      topic: body.topic,
      model,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to improve post") },
      { status: 500 }
    );
  }
}
