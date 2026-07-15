-- V19: Admin RPC to purge transactional attendance data only.
-- Preserves employees, departments, designations, and all master configuration.
-- Run in Supabase SQL Editor when API route is unavailable.

CREATE OR REPLACE FUNCTION public.purge_attendance_transactional_data_v19()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_count integer := 0;
  staging_count integer := 0;
  biometric_count integer := 0;
  employee_att_count integer := 0;
BEGIN
  IF to_regclass('public.attendance_audit_log') IS NOT NULL THEN
    DELETE FROM public.attendance_audit_log;
    GET DIAGNOSTICS audit_count = ROW_COUNT;
  END IF;

  IF to_regclass('public.attendance_staging') IS NOT NULL THEN
    DELETE FROM public.attendance_staging;
    GET DIAGNOSTICS staging_count = ROW_COUNT;
  END IF;

  IF to_regclass('public.biometric_attendance') IS NOT NULL THEN
    DELETE FROM public.biometric_attendance;
    GET DIAGNOSTICS biometric_count = ROW_COUNT;
  END IF;

  IF to_regclass('public.employee_attendance') IS NOT NULL THEN
    DELETE FROM public.employee_attendance;
    GET DIAGNOSTICS employee_att_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'version', 'V19',
    'tables', jsonb_build_object(
      'attendance_audit_log', audit_count,
      'attendance_staging', staging_count,
      'biometric_attendance', biometric_count,
      'employee_attendance', employee_att_count
    ),
    'message', 'Transactional attendance purge complete. Master config preserved.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_attendance_transactional_data_v19() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_attendance_transactional_data_v19() TO service_role;

COMMENT ON FUNCTION public.purge_attendance_transactional_data_v19() IS
  'V19 admin purge — removes imported attendance rows only; does not touch employees/departments/designations.';
