"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "shaandar-crm-api-integration";

type ApiIntegrationSettings = {
  attendanceToken: string;
};

function readSettings(): ApiIntegrationSettings {
  if (typeof window === "undefined") {
    return { attendanceToken: "" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attendanceToken: "" };
    const parsed = JSON.parse(raw) as Partial<ApiIntegrationSettings>;
    return { attendanceToken: parsed.attendanceToken ?? "" };
  } catch {
    return { attendanceToken: "" };
  }
}

function writeSettings(settings: ApiIntegrationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function generateSecureKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `sk_att_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `sk_att_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export function useApiIntegrationSettings() {
  const [settings, setSettings] = useState<ApiIntegrationSettings>({ attendanceToken: "" });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setIsReady(true);
  }, []);

  const attendanceWebhookPath = "/api/v1/attendance/sync";

  const attendanceWebhookUrl = useMemo(() => {
    if (typeof window === "undefined") return attendanceWebhookPath;
    return `${window.location.origin}${attendanceWebhookPath}`;
  }, [attendanceWebhookPath]);

  const generateAttendanceToken = useCallback(() => {
    const token = generateSecureKey();
    const next = { attendanceToken: token };
    setSettings(next);
    writeSettings(next);
    return token;
  }, []);

  const setAttendanceToken = useCallback((token: string) => {
    const next = { attendanceToken: token.trim() };
    setSettings(next);
    writeSettings(next);
  }, []);

  return {
    attendanceToken: settings.attendanceToken,
    attendanceWebhookPath,
    attendanceWebhookUrl,
    isReady,
    generateAttendanceToken,
    setAttendanceToken,
  };
}
