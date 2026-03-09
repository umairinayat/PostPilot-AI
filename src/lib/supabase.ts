import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBrowserSupabase() {
  if (!browserClient) {
    browserClient = createClient<Database>(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return browserClient;
}

let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceSupabase() {
  if (!serviceClient) {
    serviceClient = createClient<Database>(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
  }

  return serviceClient;
}
