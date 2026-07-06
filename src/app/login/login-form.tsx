"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, ShieldCheck, User } from "lucide-react";
import { establishSessionAction, loginAction } from "./actions";
import { validateDemoAdminLogin } from "@/lib/auth";
import {
  createPendingOtpSession,
  findManagedUserByUsername,
  verifyPendingOtp,
} from "@/lib/managed-users-store";

type LoginStep = "credentials" | "otp";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (step === "otp") {
      setOtpCode("");
    }
  }, [step]);

  const completeLogin = async () => {
    if (validateDemoAdminLogin(username, password)) {
      const formData = new FormData();
      formData.set("email", "admin@shaandar.com");
      formData.set("password", password);
      const result = await loginAction({}, formData);
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      }
      return;
    }

    const result = await establishSessionAction();
    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password;

      if (!trimmedUsername || !trimmedPassword) {
        setError("Please enter both username and password.");
        return;
      }

      if (validateDemoAdminLogin(trimmedUsername, trimmedPassword)) {
        await completeLogin();
        return;
      }

      const managedUser = findManagedUserByUsername(trimmedUsername);
      if (!managedUser || managedUser.password !== trimmedPassword) {
        setError("Invalid username or password. Please try again.");
        return;
      }

      if (managedUser.otpEnabled) {
        const session = createPendingOtpSession(managedUser.username, 6);
        setSimulatedOtp(session.code);
        setStep("otp");
        return;
      }

      await completeLogin();
    } finally {
      setIsPending(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      if (!otpCode.trim()) {
        setError("Enter the 6-digit verification code.");
        return;
      }

      if (!verifyPendingOtp(username, otpCode)) {
        setError("Invalid or expired verification code. Please try again.");
        return;
      }

      await completeLogin();
    } finally {
      setIsPending(false);
    }
  };

  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-5">
        <div className="rounded-lg border border-corporate-brand/30 bg-corporate-brand-light px-4 py-3">
          <div className="flex items-center gap-2 text-corporate-brand">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            <p className="text-sm font-semibold">Secure OTP Verification</p>
          </div>
          <p className="mt-2 text-xs text-corporate-muted">
            Enter the 6-digit one-time passcode sent for account{" "}
            <span className="font-semibold text-corporate-text">{username}</span>.
          </p>
          <p className="mt-2 rounded-md border border-dashed border-corporate-border bg-white px-3 py-2 font-mono text-sm text-corporate-text">
            Simulated OTP: {simulatedOtp}
          </p>
        </div>

        <div>
          <label
            htmlFor="otp"
            className="mb-1.5 block text-sm font-medium text-corporate-text"
          >
            Verification Code
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            required
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            className="input-field font-mono tracking-[0.3em]"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
              setSimulatedOtp("");
            }}
            className="rounded-full border border-corporate-border px-5 py-2.5 text-sm font-semibold text-corporate-text hover:bg-corporate-bg"
          >
            Back
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Verifying..." : "Verify & Sign In"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentialsSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-sm font-medium text-corporate-text"
        >
          Username
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
            aria-hidden
          />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin or your username"
            className="input-field pl-10"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-corporate-text"
        >
          Password
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
            aria-hidden
          />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="input-field pl-10"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Signing in..." : "Sign In"}
      </button>

      <p className="rounded-lg border border-corporate-border bg-corporate-bg px-3 py-2 text-center text-xs text-corporate-muted">
        Demo admin: <span className="font-medium text-corporate-text">admin</span> /{" "}
        <span className="font-medium text-corporate-text">admin123</span>
      </p>
    </form>
  );
}

export function LoginBrand() {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-corporate-brand-light text-corporate-brand shadow-card">
        <Building2 className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-corporate-text">
        Shaandar CRM
      </h1>
      <p className="mt-1 text-sm text-corporate-muted">
        Sign in to your corporate workspace
      </p>
    </div>
  );
}
