import type { DefaultSession } from "next-auth";

type AppPlan = "free" | "pro" | "agency";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan: AppPlan;
      credits: number;
    };
  }

  interface User {
    id?: string;
    plan?: AppPlan;
    credits?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    plan?: AppPlan;
    credits?: number;
  }
}
