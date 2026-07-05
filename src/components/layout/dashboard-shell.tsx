"use client";

import { Menu } from "lucide-react";
import { Suspense, useState } from "react";
import Sidebar from "./sidebar";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  onMenuOpen,
}: {
  title: string;
  description?: string;
  onMenuOpen?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-corporate-border bg-corporate-surface px-4 py-3 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onMenuOpen && (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-corporate-border text-corporate-muted transition-colors hover:bg-corporate-bg md:hidden"
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-corporate-text sm:text-xl">
            {title}
          </h1>
          {description && (
            <p className="truncate text-sm text-corporate-muted">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNavShell({
  mobileOpen,
  setMobileOpen,
  children,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen w-full bg-corporate-bg">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 md:hidden",
          mobileOpen ? "block" : "hidden"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(100vw,16rem)] transition-transform md:static md:w-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Suspense
          fallback={
            <div className="h-full w-64 shrink-0 border-r border-corporate-border bg-corporate-surface" />
          }
        >
          <Sidebar
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </Suspense>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileNavShell mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
      {children}
    </MobileNavShell>
  );
}

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileNavShell mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
      <PageHeader
        title={title}
        description={description}
        onMenuOpen={() => setMobileOpen(true)}
      />
      <main className="flex w-full min-w-0 flex-1 flex-col p-3 md:p-5">{children}</main>
    </MobileNavShell>
  );
}
