import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { NextResponse } from "next/server";
import GoogleProvider from "next-auth/providers/google";
import { getServiceSupabase } from "@/lib/supabase";

type AppPlan = "free" | "pro" | "agency";

type AppUserRecord = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: AppPlan;
  credits: number;
};

async function getAppUserByEmail(email: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, avatar_url, plan, credits")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AppUserRecord | null) ?? null;
}

async function upsertAppUser({
  email,
  name,
  image,
}: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const supabase = getServiceSupabase();
  const existingUser = await getAppUserByEmail(email);

  if (existingUser) {
    const hasProfileChanges =
      existingUser.name !== (name ?? null) ||
      existingUser.avatar_url !== (image ?? null);

    if (hasProfileChanges) {
      const { data, error } = await supabase
        .from("users")
        .update({
          name: name ?? existingUser.name,
          avatar_url: image ?? existingUser.avatar_url,
        })
        .eq("id", existingUser.id)
        .select("id, email, name, avatar_url, plan, credits")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as AppUserRecord;
    }

    return existingUser;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      name: name ?? null,
      avatar_url: image ?? null,
      plan: "free",
      credits: 5,
    })
    .select("id, email, name, avatar_url, plan, credits")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AppUserRecord;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/auth/login",
    newUser: "/app",
  },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? "";
        session.user.plan = token.plan ?? "free";
        session.user.credits = typeof token.credits === "number" ? token.credits : 5;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const appUser = await upsertAppUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });

        token.userId = appUser.id;
        token.plan = appUser.plan;
        token.credits = appUser.credits;
        token.sub = appUser.id;
      } else if (token.email) {
        const appUser = await getAppUserByEmail(token.email);

        if (appUser) {
          token.userId = appUser.id;
          token.plan = appUser.plan;
          token.credits = appUser.credits;
          token.sub = appUser.id;
        }
      }

      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require an authenticated user or return a 401 JSON response.
 * Use in API route handlers:
 *   const result = await requireAuth();
 *   if (result.response) return result.response;
 *   const user = result.user;
 */
export async function requireAuth(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response?: never }
  | { user?: never; response: ReturnType<typeof NextResponse.json> }
> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user: currentUser };
}
