
-- Add plan column to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'FREE';

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_plan ON public.workspaces(plan);
