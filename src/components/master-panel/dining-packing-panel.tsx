"use client";

import PackingTransactionStubPanel from "./packing-transaction-stub-panel";

const DINING_PACKING_DEPARTMENT = "Dinning packing";

export default function DiningPackingPanel() {
  return (
    <PackingTransactionStubPanel
      moduleName="Dining Packing"
      departmentName={DINING_PACKING_DEPARTMENT}
      primaryLabel="Employee Name"
      secondaryLabel="Work Date"
      placeholderMessage="Dining Packing labor and production entry will be available in a future update."
    />
  );
}
