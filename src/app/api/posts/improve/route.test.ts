import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  improvePostDraftMock,
  enforceRateLimitMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  improvePostDraftMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/openrouter", () => ({
  improvePostDraft: improvePostDraftMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRateLimitHeaders: () => ({
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": "0",
    "Retry-After": "60",
  }),
}));

import { POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/posts/improve", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  }) as NextRequest;
}

describe("POST /api/posts/improve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue({
      success: true,
      limit: 15,
      remaining: 14,
      retryAfter: 0,
    });
  });

  it("returns 401 when the user is not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(createRequest({ content: "Draft" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the user exceeds the improve rate limit", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123", plan: "free" });
    enforceRateLimitMock.mockResolvedValue({
      success: false,
      limit: 15,
      remaining: 0,
      retryAfter: 60,
    });

    const response = await POST(createRequest({ content: "Draft" }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/Rate limit reached/i);
    expect(improvePostDraftMock).not.toHaveBeenCalled();
  });

  it("improves a draft for an authenticated user", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123", plan: "pro" });
    improvePostDraftMock.mockResolvedValue({
      improvedPost: "Improved draft",
      hashtags: ["#ai", "#linkedin"],
    });

    const response = await POST(
      createRequest({
        content: "Draft",
        topic: "Growth",
        tone: "Educational",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(improvePostDraftMock).toHaveBeenCalledWith({
      content: "Draft",
      topic: "Growth",
      tone: "Educational",
      model: "anthropic/claude-3.5-sonnet",
    });
    expect(data).toEqual({
      improvedPost: "Improved draft",
      hashtags: ["#ai", "#linkedin"],
    });
  });
});
