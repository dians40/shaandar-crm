"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-corporate-text"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-corporate-muted"
            aria-hidden
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
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
            placeholder="Enter your password"
            className="input-field pl-10"
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Signing in..." : "Sign In"}
      </button>

      <p className="rounded-lg border border-corporate-border bg-corporate-bg px-3 py-2 text-center text-xs text-corporate-muted">
        Demo: <span className="font-medium text-corporate-text">admin@shaandar.com</span>{" "}
        / <span className="font-medium text-corporate-text">admin123</span>
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
