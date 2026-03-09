import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const supabaseLinkDir = path.join(root, ".supabase");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }

    const [key, ...rest] = line.split("=");
    values[key.trim()] = rest.join("=").trim();
  }

  return values;
}

function isPlaceholder(value = "") {
  return (
    !value ||
    value.includes("your_") ||
    value === "http://localhost:3000" ||
    value === "http://127.0.0.1:3000"
  );
}

const env = readEnvFile(envPath);
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const missingOrPlaceholder = requiredKeys.filter((key) => isPlaceholder(env[key]));
const hasSupabaseLink = fs.existsSync(supabaseLinkDir);

console.log("PostPilot live verification check\n");
console.log(`- .env.local present: ${fs.existsSync(envPath) ? "yes" : "no"}`);
console.log(`- .supabase link present: ${hasSupabaseLink ? "yes" : "no"}`);

if (missingOrPlaceholder.length > 0) {
  console.log("\nMissing or placeholder env values:");
  for (const key of missingOrPlaceholder) {
    console.log(`- ${key}`);
  }
}

if (missingOrPlaceholder.length === 0 && hasSupabaseLink) {
  console.log("\nReady for:");
  console.log("- npm run supabase:push:dry");
  console.log("- npm run supabase:push");
  console.log("- open /app/system and run live verification checklist");
} else {
  console.log("\nNext actions:");
  console.log("- Set real dev Supabase values in .env.local");
  console.log("- Run: npx supabase login");
  console.log("- Run: npx supabase link --project-ref <your-dev-project-ref>");
  console.log("- Then run: npm run supabase:push:dry");
}
