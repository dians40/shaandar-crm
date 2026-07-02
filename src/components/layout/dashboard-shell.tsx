"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-corporate-border bg-corporate-surface px-4 py-4 lg:px-8">
      <div className="flex items-center gap-3">
        {onMenuOpen && (
          <button
            type="button"
            className="rounded-lg border border-corporate-border p-2 text-corporate-muted hover:bg-corporate-bg lg:hidden"
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-corporate-text">{title}</h1>
          {description && (
            <p className="text-sm text-corporate-muted">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen bg-corporate-bg">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 lg:hidden",
          mobileOpen ? "block" : "hidden"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
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
    <div className="flex h-full min-h-screen bg-corporate-bg">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 lg:hidden",
          mobileOpen ? "block" : "hidden"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={title}
          description={description}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
