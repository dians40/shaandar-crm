-- Multi-firm allocation and contractor assignment for employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS assigned_firm TEXT,
  ADD COLUMN IF NOT EXISTS assigned_contractor TEXT;

COMMENT ON COLUMN employees.assigned_firm IS 'Business entity the employee is assigned to (e.g. Krishna Food Product, MAHEK Industries)';
COMMENT ON COLUMN employees.assigned_contractor IS 'Contractor under whom the employee works';
