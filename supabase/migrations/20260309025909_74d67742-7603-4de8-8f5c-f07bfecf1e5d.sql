
-- Gateway accounts table
CREATE TABLE public.gateway_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'PAGARME',
  is_active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT true,
  credentials_enc jsonb DEFAULT '{}'::jsonb,
  recipient_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

-- Payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway_account_id uuid REFERENCES public.gateway_accounts(id),
  idempotency_key text UNIQUE,
  status text NOT NULL DEFAULT 'PENDING',
  method text NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  amount numeric NOT NULL DEFAULT 0,
  gateway_fee numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  gateway_payment_id text,
  installments int NOT NULL DEFAULT 1,
  processed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PIX payment data table
CREATE TABLE public.pix_payment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE UNIQUE,
  qr_code text,
  qr_code_url text,
  copy_paste_code text,
  tx_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Refunds table
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  gateway_refund_id text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN',
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  gateway_dispute_id text,
  evidence jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook events table
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  provider text NOT NULL,
  event_type text NOT NULL,
  external_event_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'RECEIVED',
  attempts int NOT NULL DEFAULT 0,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_event_id)
);

-- RLS policies
ALTER TABLE public.gateway_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_payment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Gateway accounts: workspace owners only
CREATE POLICY "Users can manage gateway accounts" ON public.gateway_accounts
  FOR ALL TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid() AND workspace_members.role IN ('OWNER', 'ADMIN'))
  );

-- Payments: workspace members can view
CREATE POLICY "Users can view payments of their workspaces" ON public.payments
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
  );

-- Public can view their own payments (for checkout polling)
CREATE POLICY "Public can view payments by id" ON public.payments
  FOR SELECT TO anon USING (true);

-- PIX data: linked to payment
CREATE POLICY "Public can view pix data" ON public.pix_payment_data
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can view pix data" ON public.pix_payment_data
  FOR SELECT TO authenticated USING (
    payment_id IN (SELECT p.id FROM payments p WHERE p.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid()))
  );

-- Refunds: workspace members
CREATE POLICY "Users can view refunds" ON public.refunds
  FOR SELECT TO authenticated USING (
    order_id IN (SELECT o.id FROM orders o WHERE o.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid()))
  );

-- Disputes: workspace members
CREATE POLICY "Users can view disputes" ON public.disputes
  FOR SELECT TO authenticated USING (
    order_id IN (SELECT o.id FROM orders o WHERE o.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid()))
  );

-- Webhook events: workspace members
CREATE POLICY "Users can view webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
  );

-- Updated_at triggers
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
