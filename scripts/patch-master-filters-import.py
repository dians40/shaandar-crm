#!/usr/bin/env python3
"""Patch remaining master panels: add useMasterListFilters import."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "src/components/master-panel/general-settings-management-panel.tsx",
    "src/components/master-panel/overtime-tracker-panel.tsx",
    "src/components/master-panel/items-management-panel.tsx",
    "src/components/master-panel/manufacturing-voucher-panel.tsx",
    "src/components/master-panel/journal-entry-panel.tsx",
    "src/components/master-panel/transfer-voucher-panel.tsx",
    "src/components/master-panel/preventive-maintenance-panel.tsx",
    "src/components/master-panel/parts-order-panel.tsx",
    "src/components/master-panel/vehicle-management-transaction-panel.tsx",
    "src/components/master-panel/inventory-voucher-panel.tsx",
    "src/components/master-panel/expense-receipt-panel.tsx",
    "src/components/master-panel/bom-management-panel.tsx",
    "src/components/master-panel/unit-conversion-management-panel.tsx",
]

EXTEND = """,
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }"""

def add_import(content: str) -> str:
    if "useMasterListFilters" in content:
        return content
    return content.replace(
        "  UniversalMasterListTable,\n} from \"./universal-master-list\";",
        "  UniversalMasterListTable,\n  useMasterListFilters,\n} from \"./universal-master-list\";",
    ).replace(
        "  UniversalMasterListShell,\n} from \"./universal-master-list\";",
        "  UniversalMasterListShell,\n  useMasterListFilters,\n} from \"./universal-master-list\";",
    )

for rel in FILES:
    path = ROOT / rel
    if not path.exists():
        print("missing", rel)
        continue
    text = path.read_text(encoding="utf-8")
    updated = add_import(text)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        print("import added:", rel)
    else:
        print("import skip:", rel)
