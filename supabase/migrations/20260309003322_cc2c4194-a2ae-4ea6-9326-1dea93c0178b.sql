-- Create orders table for tracking sales and revenue
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_avatar_url TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_events table for tracking visits and events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  storefront_id UUID REFERENCES public.storefronts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('PAGE_VIEW', 'PRODUCT_VIEW', 'CLICK', 'CONVERSION')),
  visitor_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  page_path TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table for tracking lead generation
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  source TEXT,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view orders of their workspaces"
ON public.orders
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert orders for their workspaces"
ON public.orders
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'MEMBER')
));

CREATE POLICY "Users can update orders of their workspaces"
ON public.orders
FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid()
));

-- Create RLS policies for analytics_events
CREATE POLICY "Users can view analytics of their workspaces"
ON public.analytics_events
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert analytics events for their workspaces"
ON public.analytics_events
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'MEMBER')
));

-- Create RLS policies for leads
CREATE POLICY "Users can view leads of their workspaces"
ON public.leads
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert leads for their workspaces"
ON public.leads
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'MEMBER')
));

CREATE POLICY "Users can update leads of their workspaces"
ON public.leads
FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete leads of their workspaces"
ON public.leads
FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
));

-- Create indexes for better query performance
CREATE INDEX idx_orders_workspace_id ON public.orders(workspace_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX idx_analytics_events_workspace_id ON public.analytics_events(workspace_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

CREATE INDEX idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();