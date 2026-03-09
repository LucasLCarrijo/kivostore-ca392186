
-- Email sequences (flows)
CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email sequence steps
CREATE TABLE public.email_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email sequence enrollments
CREATE TABLE public.email_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- Sequences: workspace members can manage
CREATE POLICY "Users can manage sequences of their workspaces"
ON public.email_sequences FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Steps: via sequence ownership
CREATE POLICY "Users can manage steps of their sequences"
ON public.email_sequence_steps FOR ALL TO authenticated
USING (sequence_id IN (SELECT id FROM email_sequences WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))
WITH CHECK (sequence_id IN (SELECT id FROM email_sequences WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- Enrollments: workspace members can view
CREATE POLICY "Users can view enrollments of their sequences"
ON public.email_sequence_enrollments FOR SELECT TO authenticated
USING (sequence_id IN (SELECT id FROM email_sequences WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- Service role can manage enrollments
CREATE POLICY "Service role can manage enrollments"
ON public.email_sequence_enrollments FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
