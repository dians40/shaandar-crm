import type { SalaryComponentRecord } from "@/types/salary-component";

const NOW = "2020-01-01T00:00:00.000Z";

export function buildSeedSalaryComponents(): SalaryComponentRecord[] {
  return [
    {
      id: "sal-basic",
      componentName: "Basic Salary",
      componentType: "earning",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sal-da",
      componentName: "DA",
      componentType: "earning",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sal-hra",
      componentName: "HRA",
      componentType: "earning",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sal-advance",
      componentName: "Advance Salary Deduction / Recovery",
      componentType: "deduction",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sal-pf",
      componentName: "Provident Fund (PF)",
      componentType: "deduction",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "sal-esi",
      componentName: "Employee State Insurance (ESI)",
      componentType: "deduction",
      isSystemSeed: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
}
