"use client";

import { cn } from "@/lib/utils";
import {
  PARTS_ORDER_STAGES,
  PARTS_ORDER_STAGE_SHORT_LABELS,
  type PartsOrderStage,
} from "@/types/parts-order-workflow";

type Props = {
  activeStage: PartsOrderStage;
  onChange: (stage: PartsOrderStage) => void;
  counts: Partial<Record<PartsOrderStage, number>>;
};

export default function PartsOrderStagePills({ activeStage, onChange, counts }: Props) {
  return (
    <div
      className="flex flex-col gap-2"
      role="tablist"
      aria-label="Parts order workflow stages"
    >
      {PARTS_ORDER_STAGES.map((stage, index) => {
        const isActive = stage === activeStage;
        const count = counts[stage] ?? 0;
        return (
          <button
            key={stage}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(stage)}
            className={cn(
              "rounded-full border px-5 py-2.5 text-left text-sm font-semibold transition-colors",
              isActive
                ? "border-corporate-brand bg-corporate-brand text-white shadow-sm"
                : "border-corporate-border bg-white text-corporate-text hover:border-corporate-brand/40 hover:bg-corporate-brand/5"
            )}
          >
            <span className="block">
              {index + 1}. {PARTS_ORDER_STAGE_SHORT_LABELS[stage]}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-xs font-normal",
                isActive ? "text-white/85" : "text-corporate-muted"
              )}
            >
              {count} record{count === 1 ? "" : "s"} in queue
            </span>
          </button>
        );
      })}
    </div>
  );
}
