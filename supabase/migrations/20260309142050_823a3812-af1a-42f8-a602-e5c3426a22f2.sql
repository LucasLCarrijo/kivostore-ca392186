
-- Recovery emails table for abandoned cart sequences
CREATE TABLE public.recovery_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id UUID NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_number INTEGER NOT NULL CHECK (email_number BETWEEN 1 AND 3),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (checkout_session_id, email_number)
);

-- RLS
ALTER TABLE public.recovery_emails ENABLE ROW LEVEL SECURITY;

-- Workspace members can view recovery emails
CREATE POLICY "Users can view recovery emails of their workspaces"
  ON public.recovery_emails FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_members.workspace_id FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  ));

-- Service role can manage (edge functions)
CREATE POLICY "Service role can manage recovery emails"
  ON public.recovery_emails FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Index for the cron query
CREATE INDEX idx_recovery_emails_pending ON public.recovery_emails (scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_recovery_emails_session ON public.recovery_emails (checkout_session_id);
