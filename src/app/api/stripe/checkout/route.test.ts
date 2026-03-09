import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  getStripePriceIdMock,
  customersCreateMock,
  checkoutCreateMock,
  maybeSingleMock,
  updateEqMock,
  getServiceSupabaseMock,
} = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
  const updateEq = vi.fn().mockResolvedValue({});
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn((table: string) => {
    if (table === "users") {
      return {
        select,
        update,
      };
    }

    return {};
  });

  return {
    getCurrentUserMock: vi.fn(),
    getStripePriceIdMock: vi.fn(),
    customersCreateMock: vi.fn(),
    checkoutCreateMock: vi.fn(),
    maybeSingleMock: maybeSingle,
    selectMock: select,
    eqMock: select().eq,
    updateEqMock: updateEq,
    updateMock: update,
    fromMock: from,
    getServiceSupabaseMock: vi.fn(() => ({ from })),
  };
});

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripePriceId: getStripePriceIdMock,
  stripe: {
    customers: {
      create: customersCreateMock,
    },
    checkout: {
      sessions: {
        create: checkoutCreateMock,
      },
    },
  },
}));

vi.mock("@/lib/supabase", () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

import { POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  }) as NextRequest;
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripePriceIdMock.mockReturnValue("price_123");
    maybeSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: "cus_existing",
        email: "owner@example.com",
        name: "Owner",
      },
      error: null,
    });
    checkoutCreateMock.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
  });

  it("returns 401 for unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await POST(createRequest({ plan: "pro" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("creates a Stripe customer when one is missing", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      name: "Owner",
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: null,
        email: "owner@example.com",
        name: "Owner",
      },
      error: null,
    });
    customersCreateMock.mockResolvedValue({ id: "cus_new" });

    const response = await POST(createRequest({ plan: "pro", billingCycle: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(customersCreateMock).toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalledWith("id", "user_123");
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    );
    expect(data.url).toContain("checkout.stripe.test");
  });

  it("returns 400 when the Stripe price is not configured", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_123" });
    getStripePriceIdMock.mockReturnValue("");

    const response = await POST(createRequest({ plan: "pro", billingCycle: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/not configured/i);
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });
});
