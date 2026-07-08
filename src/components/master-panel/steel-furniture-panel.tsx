"use client";

import PackingTransactionStubPanel from "./packing-transaction-stub-panel";

const STEEL_FURNITURE_DEPARTMENT = "Steel Furniture";

export default function SteelFurniturePanel() {
  return (
    <PackingTransactionStubPanel
      moduleName="Steel Furniture"
      departmentName={STEEL_FURNITURE_DEPARTMENT}
      primaryLabel="Employee Name"
      secondaryLabel="Work Date"
      placeholderMessage="Steel Furniture production logging will be available in a future update."
    />
  );
}
