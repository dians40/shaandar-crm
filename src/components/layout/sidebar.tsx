"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { sidebarNavItems } from "@/constants/nav-config";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-corporate-border bg-corporate-surface">
      <div className="flex items-center gap-3 border-b border-corporate-border px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-corporate-brand-light text-corporate-brand">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-corporate-text">
            Shaandar CRM
          </p>
          <p className="text-xs text-corporate-muted">Corporate Suite</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {sidebarNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-corporate-brand-light text-corporate-brand"
                      : "text-corporate-muted hover:bg-corporate-bg hover:text-corporate-text"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-corporate-border p-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-corporate-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
