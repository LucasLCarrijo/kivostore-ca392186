
-- WhatsApp configuration per workspace
CREATE TABLE public.whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  instance_name TEXT,
  instance_id TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  api_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, trigger_type)
);

-- RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace whatsapp config"
ON public.whatsapp_config FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own workspace whatsapp templates"
ON public.whatsapp_templates FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Service role for edge functions
CREATE POLICY "Service role manages whatsapp config"
ON public.whatsapp_config FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages whatsapp templates"
ON public.whatsapp_templates FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
