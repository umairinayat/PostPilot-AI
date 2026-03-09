import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, syncInspirationFeedMock, enforceRateLimitMock } = vi.hoisted(
  () => ({
    getCurrentUserMock: vi.fn(),
    syncInspirationFeedMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
  })
);

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/inspiration", () => ({
  syncInspirationFeed: syncInspirationFeedMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRateLimitHeaders: () => ({
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": "0",
    "Retry-After": "3600",
  }),
}));

import { POST } from "./route";

describe("POST /api/inspiration/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      retryAfter: 0,
    });
  });

  it("returns 401 for unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });
    enforceRateLimitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      retryAfter: 3600,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/Rate limit reached/i);
    expect(syncInspirationFeedMock).not.toHaveBeenCalled();
  });

  it("syncs the inspiration feed", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });
    syncInspirationFeedMock.mockResolvedValue({ source: "external", count: 12 });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(syncInspirationFeedMock).toHaveBeenCalled();
    expect(data.success).toBe(true);
    expect(data.source).toBe("external");
    expect(data.count).toBe(12);
  });
});
