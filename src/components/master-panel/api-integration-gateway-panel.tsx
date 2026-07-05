"use client";

import { useState } from "react";
import { Copy, KeyRound, Plug, RefreshCw } from "lucide-react";
import { TextInput } from "@/components/forms/form-fields";
import { useApiIntegrationSettings } from "@/hooks/use-api-integration-settings";

export default function ApiIntegrationGatewayPanel() {
  const {
    attendanceToken,
    attendanceWebhookUrl,
    isReady,
    generateAttendanceToken,
    setAttendanceToken,
  } = useApiIntegrationSettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      window.prompt(`Copy ${label}:`, value);
    }
  };

  if (!isReady) {
    return (
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-8 text-center text-sm text-corporate-muted">
        Loading API Integration Gateway...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-corporate-brand/10 p-2 text-corporate-brand">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-corporate-text">
              API Integration Gateway
            </h2>
            <p className="text-sm text-corporate-muted">
              Secure webhook endpoints for biometric machines and external system sync.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card">
        <h3 className="text-base font-semibold text-corporate-text">
          Attendance Machine Webhook
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-corporate-muted">
          Configure your biometric attendance machine software to push logs to this secure
          webhook URL via POST requests containing{" "}
          <code className="rounded bg-corporate-bg px-1 py-0.5 text-xs">employee_id</code>,{" "}
          <code className="rounded bg-corporate-bg px-1 py-0.5 text-xs">punch_in</code>, and{" "}
          <code className="rounded bg-corporate-bg px-1 py-0.5 text-xs">punch_out</code>{" "}
          parameters for real-time auto-sync.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-corporate-text">
              Attendance Machine Webhook URL Endpoint
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={attendanceWebhookUrl}
                className="min-w-0 flex-1 rounded-lg border border-corporate-border bg-corporate-bg px-3 py-2 text-sm text-corporate-text"
              />
              <button
                type="button"
                onClick={() => copyToClipboard("webhook", attendanceWebhookUrl)}
                className="inline-flex items-center gap-1.5 rounded-full border border-corporate-border px-4 py-2 text-sm font-medium"
              >
                <Copy className="h-4 w-4" />
                {copiedField === "webhook" ? "Copied" : "Copy URL"}
              </button>
            </div>
          </div>

          <TextInput
            label="API Authentication Token"
            value={attendanceToken}
            onChange={(e) => setAttendanceToken(e.target.value)}
            placeholder="Generate or paste your secure bearer token"
            hint="Set the same value as ATTENDANCE_SYNC_API_TOKEN in Vercel for live webhook auth."
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const token = generateAttendanceToken();
                void copyToClipboard("token", token);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-corporate-brand px-5 py-2 text-sm font-semibold text-white"
            >
              <KeyRound className="h-4 w-4" />
              Generate Secure Key
            </button>
            {attendanceToken && (
              <button
                type="button"
                onClick={() => copyToClipboard("token", attendanceToken)}
                className="inline-flex items-center gap-1.5 rounded-full border border-corporate-border px-5 py-2 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" />
                {copiedField === "token" ? "Token Copied" : "Copy Token"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-corporate-brand/40 bg-corporate-brand-light/20 p-5">
        <div className="flex items-start gap-2">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-corporate-brand" />
          <div className="text-sm text-corporate-text">
            <p className="font-semibold">Deployment checklist</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-corporate-muted">
              <li>Generate a secure key and copy it.</li>
              <li>Add ATTENDANCE_SYNC_API_TOKEN to your Vercel environment variables.</li>
              <li>
                Configure the biometric device to POST JSON with Authorization Bearer header.
              </li>
              <li>Overtime payouts remain independent — tracked day-by-day in Overtime Tracker.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
