-- Add ADMIN_PENALTY to point_action enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_PENALTY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'point_action')) THEN
    ALTER TYPE public.point_action ADD VALUE 'ADMIN_PENALTY';
  END IF;
END$$;