import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  getPostAccessMock,
  publishToLinkedInMock,
  enforceRateLimitMock,
  updateMock,
  eqMock,
  fromMock,
  getServiceSupabaseMock,
} = vi.hoisted(() => {
  const eq = vi.fn().mockResolvedValue({});
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return {
    getCurrentUserMock: vi.fn(),
    getPostAccessMock: vi.fn(),
    publishToLinkedInMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
    updateMock: update,
    eqMock: eq,
    fromMock: from,
    getServiceSupabaseMock: vi.fn(() => ({ from })),
  };
});

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/post-access", () => ({
  getPostAccess: getPostAccessMock,
}));

vi.mock("@/lib/linkedin", () => ({
  publishToLinkedIn: publishToLinkedInMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRateLimitHeaders: () => ({
    "X-RateLimit-Limit": "40",
    "X-RateLimit-Remaining": "0",
    "Retry-After": "3600",
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

import { POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/linkedin/publish", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  }) as NextRequest;
}

describe("POST /api/linkedin/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue({
      success: true,
      limit: 40,
      remaining: 39,
      retryAfter: 0,
    });
  });

  it("returns 429 when publish rate limit is exceeded", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });
    enforceRateLimitMock.mockResolvedValue({
      success: false,
      limit: 40,
      remaining: 0,
      retryAfter: 3600,
    });

    const response = await POST(createRequest({ content: "Hello" }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/Rate limit reached/i);
  });

  it("rejects content that is too long", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });

    const response = await POST(
      createRequest({ content: "x".repeat(3001) })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/too long/i);
    expect(publishToLinkedInMock).not.toHaveBeenCalled();
  });

  it("publishes a saved post and updates database metadata", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });
    getPostAccessMock.mockResolvedValue({
      role: "owner",
      post: { id: "post_1", content: "Publish me", user_id: "user_123" },
    });
    publishToLinkedInMock.mockResolvedValue({
      linkedInPostId: "urn:li:ugcPost:123",
      postUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:123/",
    });

    const response = await POST(createRequest({ postId: "post_1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getPostAccessMock).toHaveBeenCalledWith("user_123", "post_1");
    expect(publishToLinkedInMock).toHaveBeenCalledWith({
      userId: "user_123",
      content: "Publish me",
    });
    expect(fromMock).toHaveBeenCalledWith("posts");
    expect(updateMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("id", "post_1");
    expect(data.success).toBe(true);
    expect(data.linkedInPostId).toContain("ugcPost");
  });
});
