"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

type Health = {
  ok: boolean;
  configured?: boolean;
  connected?: boolean;
  error?: string;
  employeeCount?: number;
};

export default function SupabaseSetupBanner() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health/supabase")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, error: "Could not reach health check." }));
  }, []);

  if (!health || health.ok) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-amber-900">Supabase is not connected — Employee module will not work</p>
          <p className="text-amber-800">{health.error}</p>
          <p className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-amber-950">
            Fix in terminal: npm run setup:supabase
          </p>

          {!health.configured && (
            <ol className="list-decimal space-y-2 pl-5 text-amber-900">
              <li>
                Open{" "}
                <strong>Vercel → shaandar-crm → Settings → Environment Variables</strong>{" "}
                (or <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env.local</code>{" "}
                for local dev)
              </li>
              <li>
                Set these three variables (no quotes around values):
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      NEXT_PUBLIC_SUPABASE_URL
                    </code>{" "}
                    ={" "}
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      https://YOUR_REF.supabase.co
                    </code>
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </code>
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      SUPABASE_SERVICE_ROLE_KEY
                    </code>
                  </li>
                </ul>
              </li>
              <li>
                Redeploy on Vercel after saving (required for{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">NEXT_PUBLIC_*</code>{" "}
                vars)
              </li>
              <li>
                Run SQL migrations in Supabase SQL Editor (in order):
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      001_create_employees.sql
                    </code>
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      002_employee_enhancements.sql
                    </code>
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      004_employee_attendance.sql
                    </code>
                  </li>
                </ul>
              </li>
            </ol>
          )}

          {health.configured && !health.connected && (
            <p className="text-amber-800">
              Keys are loaded but database connection failed. Re-run both SQL migration files in
              Supabase SQL Editor.
            </p>
          )}

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-corporate-brand hover:underline"
          >
            Open Supabase Dashboard
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function SupabaseConnectedBadge() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health/supabase")
      .then((r) => r.json())
      .then((h: Health) => setHealth(h))
      .catch(() => setHealth({ ok: false, error: "Could not reach health check." }));
  }, []);

  if (!health) return null;

  if (health.ok) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Supabase connected
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
      title={health.error}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      Not connected
    </div>
  );
}
