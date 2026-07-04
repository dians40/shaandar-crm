"use client";

import type { MasterPanelModule } from "@/constants/master-panel-modules";
import { Construction } from "lucide-react";

type Props = {
  module: MasterPanelModule;
};

export default function ModulePlaceholder({ module }: Props) {
  const Icon = module?.icon;
  const title = module?.title ?? "Module";
  const subtitle = module?.subtitle ?? "";
  const serial = module?.serial ?? "—";
  const placeholderMessage =
    module?.placeholderMessage || `${title} Coming Soon`;

  return (
    <div className="rounded-xl border border-dashed border-corporate-border bg-corporate-surface p-8 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-corporate-brand-light text-corporate-brand">
        {Icon ? (
          <Icon className="h-7 w-7" aria-hidden />
        ) : (
          <Construction className="h-7 w-7" aria-hidden />
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-corporate-brand">
        Module {serial} — ERP Sequence
      </p>
      <h2 className="mt-2 text-xl font-semibold text-corporate-text">{title}</h2>
      <p className="mt-1 text-sm text-corporate-muted">{subtitle}</p>
      <p className="mx-auto mt-5 max-w-md rounded-lg border border-corporate-border bg-corporate-bg px-4 py-3 text-sm text-corporate-text">
        {placeholderMessage}
      </p>
      {Icon && (
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-corporate-muted">
          <Icon className="h-4 w-4" aria-hidden />
          Ready for KKK role-based permissions in the next step
        </div>
      )}
    </div>
  );
}
