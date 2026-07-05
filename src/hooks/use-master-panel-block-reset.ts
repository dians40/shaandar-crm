"use client";

import { useEffect } from "react";
import type { MasterPanelModuleGroupId } from "@/constants/master-panel-modules";
import { MASTER_PANEL_BLOCK_RESET_EVENT } from "@/lib/master-panel-entity-bridge";

/** Reset local panel state when the user leaves this ERP block (Administration ↔ Transaction). */
export function useMasterPanelBlockReset(
  blockId: MasterPanelModuleGroupId,
  onReset: () => void
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ clearedBlock?: MasterPanelModuleGroupId }>
      ).detail;
      if (detail?.clearedBlock === blockId) {
        onReset();
      }
    };

    window.addEventListener(MASTER_PANEL_BLOCK_RESET_EVENT, handler);
    return () => window.removeEventListener(MASTER_PANEL_BLOCK_RESET_EVENT, handler);
  }, [blockId, onReset]);
}
