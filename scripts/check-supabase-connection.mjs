/**
 * Tests Supabase connection using .env.local (no secrets printed).
 * Run: npm run check:supabase
 */
import { loadProjectEnv, resolveSupabaseEnv } from "./load-env.mjs";

const ROOT = process.cwd();
const ENV_FILE = `${ROOT}\\.env.local`;

function mask(value) {
  if (!value) return "(empty)";
  if (value.length <= 12) return "***";
  return `${value.slice(0, 8)}...${value.slice(-4)} (${value.length} chars)`;
}

async function main() {
  console.log("\n=== Shaandar CRM — Supabase Connection Check ===\n");
  console.log(`Env file: ${ENV_FILE}\n`);

  const env = loadProjectEnv();
  const { url, serviceRoleKey, anonKey } = resolveSupabaseEnv(env);

  console.log("NEXT_PUBLIC_SUPABASE_URL:", url || "(missing)");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", mask(serviceRoleKey));
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", mask(anonKey));
  console.log("");

  if (!url && (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL)) {
    console.log("Tip: Also accepts SUPABASE_URL as alias for NEXT_PUBLIC_SUPABASE_URL");
  }

  const placeholders = [
    "YOUR_PROJECT_REF",
    "your-anon-key-here",
    "your-service-role-key-here",
  ];

  for (const p of placeholders) {
    if (url.includes(p) || serviceRoleKey.includes(p) || anonKey.includes(p)) {
      console.error("FAIL: .env.local still contains PLACEHOLDER text.");
      console.error(`       Found: "${p}"`);
      console.error("\nAuto-fix (run in terminal):");
      console.error("  npm run setup:supabase");
      console.error("\nOr manually:");
      console.error("  1. Open https://supabase.com/dashboard");
      console.error("  2. Project Settings → API");
      console.error("  3. Copy Project URL + service_role key into .env.local");
      console.error("  4. Save file, restart: npm run dev\n");
      process.exit(1);
    }
  }

  if (!url || !serviceRoleKey) {
    console.error("FAIL: Missing URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.error("       Run: npm run setup:supabase\n");
    process.exit(1);
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    console.error("FAIL: URL format invalid. Expected: https://xxxxx.supabase.co\n");
    process.exit(1);
  }

  const apiUrl = `${url.replace(/\/$/, "")}/rest/v1/employees?select=id&limit=1`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const body = await res.text();

    if (res.ok) {
      console.log("SUCCESS: Connected to Supabase!");
      console.log("         employees table is reachable.");

      const verifyUrl = `${url.replace(/\/$/, "")}/rest/v1/employees?select=assigned_from_group,esi_status,pf_status&limit=0`;
      const verifyRes = await fetch(verifyUrl, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (!verifyRes.ok) {
        const verifyBody = await verifyRes.text();
        if (verifyBody.includes("column") || verifyRes.status === 400) {
          console.log("");
          console.warn("WARNING: Migration 006 columns not found yet.");
          console.warn("         Run: npm run migrate:employees");
          console.warn("         Or paste supabase/migrations/006_employee_unified_assignment_status.sql in SQL Editor.");
        }
      } else {
        console.log("         Migration 006 columns: OK");
      }

      console.log("\nNext: Submit Add Employee form, then verify in Supabase Table Editor.\n");
      process.exit(0);
    }

    if (res.status === 401 || res.status === 403) {
      console.error(`FAIL: HTTP ${res.status} — Invalid API key.`);
      console.error("       Re-copy service_role key from Supabase → Settings → API\n");
      process.exit(1);
    }

    if (res.status === 404 || body.includes("does not exist")) {
      console.error("FAIL: Connected but 'employees' table missing.");
      console.error("       Run migrations 001, 002, 003 in Supabase SQL Editor.\n");
      process.exit(1);
    }

    console.error(`FAIL: HTTP ${res.status}`);
    console.error("Response:", body.slice(0, 300));
    console.error("\nCheck service_role key in Supabase → Settings → API\n");
    process.exit(1);
  } catch (err) {
    console.error("FAIL: Network error —", err instanceof Error ? err.message : err);
    console.error("\nCheck internet and that Project URL is correct.\n");
    process.exit(1);
  }
}

main();
