ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC(12, 2);
