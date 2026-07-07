import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIGRATION_FILES = [
  "011_ensure_attendance_tables.sql",
  "012_attendance_staging_workflow.sql",
];

/** GET — combined attendance migration SQL for Supabase SQL Editor (copy/paste). */
export async function GET() {
  const parts: string[] = [
    "-- Shaandar CRM — one-time attendance setup (run entire script in Supabase SQL Editor)",
    "-- Creates: employee_attendance, biometric_attendance, attendance_staging, attendance_audit_log",
    "",
  ];

  for (const file of MIGRATION_FILES) {
    const filePath = path.join(process.cwd(), "supabase", "migrations", file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Missing migration: ${file}` }, { status: 404 });
    }
    parts.push(`-- ===== ${file} =====`);
    parts.push(fs.readFileSync(filePath, "utf8"));
    parts.push("");
  }

  return new NextResponse(parts.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="attendance-setup.sql"',
    },
  });
}
