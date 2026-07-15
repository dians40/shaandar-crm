import { NextResponse } from "next/server";
import fs from "fs";
import { resolveMigrationFile } from "@/lib/cloud-workspace-paths";
import { readPipelineStageMigrationSql } from "@/lib/attendance-schema-ensure";

const MIGRATION_FILES = [
  "011_ensure_attendance_tables.sql",
  "012_attendance_staging_workflow.sql",
  "013_biometric_attendance_pipeline_stage.sql",
];

/** GET — attendance migration SQL for Supabase SQL Editor (copy/paste). ?file=013 for pipeline_stage only. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileParam = searchParams.get("file")?.trim();

  if (fileParam === "013" || fileParam === "pipeline-stage") {
    return new NextResponse(readPipelineStageMigrationSql(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'inline; filename="013_biometric_attendance_pipeline_stage.sql"',
      },
    });
  }

  const parts: string[] = [
    "-- Shaandar CRM — one-time attendance setup (run entire script in Supabase SQL Editor)",
    "-- Creates: employee_attendance, biometric_attendance, attendance_staging, attendance_audit_log, pipeline_stage",
    "",
  ];

  for (const file of MIGRATION_FILES) {
    const filePath = resolveMigrationFile(file);
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
