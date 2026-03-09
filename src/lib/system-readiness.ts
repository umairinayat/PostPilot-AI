import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import type { ReadinessCheck, ReadinessReport } from "@/types";

type EnvVariableCheck = {
  key: string;
  label: string;
  required: boolean;
};

const REQUIRED_ENV_VARS: EnvVariableCheck[] = [
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL", required: true },
  { key: "NEXTAUTH_SECRET", label: "NextAuth secret", required: true },
  { key: "GOOGLE_CLIENT_ID", label: "Google client id", required: true },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google client secret", required: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", required: true },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter key", required: true },
  { key: "PROXYCURL_API_KEY", label: "Proxycurl key", required: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret key", required: true },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret", required: true },
  { key: "LINKEDIN_CLIENT_ID", label: "LinkedIn client id", required: true },
  { key: "LINKEDIN_CLIENT_SECRET", label: "LinkedIn client secret", required: true },
  { key: "CRON_SECRET", label: "Cron secret", required: true },
  { key: "STRIPE_PRO_PRICE_ID", label: "Stripe Pro monthly price id", required: true },
  { key: "STRIPE_AGENCY_PRICE_ID", label: "Stripe Agency monthly price id", required: true },
];

const OPTIONAL_ENV_VARS: EnvVariableCheck[] = [
  { key: "STRIPE_PRO_YEARLY_PRICE_ID", label: "Stripe Pro yearly price id", required: false },
  { key: "STRIPE_AGENCY_YEARLY_PRICE_ID", label: "Stripe Agency yearly price id", required: false },
  { key: "INSPIRATION_FEED_URL", label: "External inspiration feed URL", required: false },
  { key: "INSPIRATION_FEED_API_KEY", label: "External inspiration feed API key", required: false },
];

const DB_TABLES = [
  { key: "users", label: "Users table" },
  { key: "profiles", label: "Profiles table" },
  { key: "posts", label: "Posts table" },
  { key: "post_collaborators", label: "Collaborators table" },
  { key: "post_versions", label: "Version history table" },
  { key: "post_metric_snapshots", label: "Analytics snapshots table" },
  { key: "inspiration_posts", label: "Inspiration feed table" },
  { key: "post_presence_sessions", label: "Presence sessions table" },
  { key: "api_rate_limit_events", label: "Rate limit events table" },
];

async function checkTable(table: { key: string; label: string }): Promise<ReadinessCheck> {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from(table.key)
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return {
        key: table.key,
        label: table.label,
        status: "fail",
        detail: error.message,
        required: true,
        category: "database",
      };
    }

    return {
      key: table.key,
      label: table.label,
      status: "pass",
      detail: "Table is reachable.",
      required: true,
      category: "database",
    };
  } catch (error) {
    return {
      key: table.key,
      label: table.label,
      status: "fail",
      detail: error instanceof Error ? error.message : "Table check failed.",
      required: true,
      category: "database",
    };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const envChecks: ReadinessCheck[] = [...REQUIRED_ENV_VARS, ...OPTIONAL_ENV_VARS].map(
    (variable) => {
      const present = Boolean(process.env[variable.key]);

      return {
        key: variable.key,
        label: variable.label,
        status: present ? "pass" : variable.required ? "fail" : "warn",
        detail: present
          ? "Configured"
          : variable.required
            ? "Missing required environment variable"
            : "Optional variable not configured",
        required: Boolean(variable.required),
        category: "environment",
      };
    }
  );

  const dbChecks = await Promise.all(DB_TABLES.map(checkTable));
  const currentUser = await getCurrentUser();
  const userChecks: ReadinessCheck[] = [];

  if (currentUser?.id) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("stripe_customer_id, linkedin_member_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      userChecks.push(
        {
          key: "stripe_customer",
          label: "Stripe customer persisted",
          status: data?.stripe_customer_id ? "pass" : "warn",
          detail: data?.stripe_customer_id
            ? "Stripe customer id stored on user record."
            : "Stripe customer id not stored yet for this account.",
          required: false,
          category: "user",
        },
        {
          key: "linkedin_connected",
          label: "LinkedIn account connected",
          status: data?.linkedin_member_id ? "pass" : "warn",
          detail: data?.linkedin_member_id
            ? "LinkedIn publishing is available for this account."
            : "Connect LinkedIn to enable publishing and analytics import.",
          required: false,
          category: "user",
        }
      );
    } catch (error) {
      userChecks.push({
        key: "user_status",
        label: "User integration status",
        status: "warn",
        detail: error instanceof Error ? error.message : "Could not inspect user setup.",
        required: false,
        category: "user",
      });
    }
  }

  const integrationChecks: ReadinessCheck[] = [
    {
      key: "cron_config",
      label: "Scheduled publishing cron",
      status: process.env.CRON_SECRET ? "pass" : "fail",
      detail: process.env.CRON_SECRET
        ? "Cron secret configured for scheduled publishing."
        : "Missing CRON_SECRET for scheduled publishing protection.",
      required: true,
      category: "integration",
    },
  ];

  const checks = [...envChecks, ...dbChecks, ...integrationChecks, ...userChecks];
  const overallStatus = checks.some(
    (check) => check.required && check.status === "fail"
  )
    ? "attention"
    : "ready";

  return {
    overallStatus,
    checks,
    checkedAt: new Date().toISOString(),
  };
}
