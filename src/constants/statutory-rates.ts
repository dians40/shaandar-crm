/** Standard India statutory rates (reference — verify for your compliance period) */
export const ESI_RATES = {
  employeePercent: 0.75,
  employerPercent: 3.25,
  wageCeilingMonthly: 21000,
  label: "ESI (Employee State Insurance)",
} as const;

export const PF_RATES = {
  employeePercent: 12,
  employerEpfPercent: 12,
  employerEpsPercent: 8.33,
  employerAdminPercent: 0.5,
  label: "EPF (Employees Provident Fund)",
} as const;

export const VARIABLE_SALARY_BASIS = ["Daily", "Weekly", "Contractor", "Contract-based"] as const;
