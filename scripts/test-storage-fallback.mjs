/**
 * Quick smoke test: schema probe + storage bucket + sample save.
 * Run: node scripts/test-storage-fallback.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("No .env.local");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("URL:", url);
console.log("Key prefix:", key.slice(0, 12) + "...");

const { error: tableError } = await supabase.from("employee_attendance").select("id").limit(1);
console.log("employee_attendance probe:", tableError?.message ?? "OK");

const bucket = "attendance-imports";
const { data: buckets } = await supabase.storage.listBuckets();
const exists = buckets?.some((b) => b.name === bucket);
console.log("bucket exists:", exists);

if (!exists) {
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 52428800,
  });
  console.log("create bucket:", createError?.message ?? "OK");
}

const testPath = `imports/2099-01-01/test-${Date.now()}.json`;
const payload = Buffer.from(
  JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    reportDate: "2099-01-01",
    rows: [{ pay_code: "TEST", employee_name: "Smoke Test", date: "2099-01-01" }],
    biometricCount: 1,
    workflowCount: 0,
  }),
  "utf8"
);

const { error: uploadError } = await supabase.storage.from(bucket).upload(testPath, payload, {
  contentType: "application/json",
});

console.log("upload test:", uploadError?.message ?? "OK -> " + testPath);

if (!uploadError) {
  await supabase.storage.from(bucket).remove([testPath]);
  console.log("cleanup: removed test file");
}

console.log("\nIf all steps show OK, cloud storage fallback will work on bulk save.");
