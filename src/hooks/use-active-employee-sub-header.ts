"use client";

import { useEffect, useState } from "react";
import {
  MASTER_PANEL_ACTIVE_EMPLOYEE_EVENT,
  MASTER_PANEL_BLOCK_RESET_EVENT,
  readActiveEmployeeSession,
  type ActiveEmployeeSession,
} from "@/lib/master-panel-entity-bridge";

export function useActiveEmployeeSubHeader(): ActiveEmployeeSession | null {
  const [session, setSession] = useState<ActiveEmployeeSession | null>(null);

  useEffect(() => {
    setSession(readActiveEmployeeSession());

    const onActiveEmployee = (event: Event) => {
      const detail = (event as CustomEvent<ActiveEmployeeSession | null>).detail;
      setSession(detail ?? readActiveEmployeeSession());
    };

    const onBlockReset = () => {
      setSession(null);
    };

    window.addEventListener(MASTER_PANEL_ACTIVE_EMPLOYEE_EVENT, onActiveEmployee);
    window.addEventListener(MASTER_PANEL_BLOCK_RESET_EVENT, onBlockReset);
    return () => {
      window.removeEventListener(MASTER_PANEL_ACTIVE_EMPLOYEE_EVENT, onActiveEmployee);
      window.removeEventListener(MASTER_PANEL_BLOCK_RESET_EVENT, onBlockReset);
    };
  }, []);

  return session;
}
