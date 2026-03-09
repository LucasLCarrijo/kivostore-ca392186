
-- Lesson progress table
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  member_content_id uuid NOT NULL REFERENCES public.member_content(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  progress_percent int NOT NULL DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, member_content_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Buyers (authenticated) can manage their own progress
CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress
  FOR SELECT TO authenticated USING (
    customer_id IN (
      SELECT c.id FROM customers c WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own lesson progress" ON public.lesson_progress
  FOR INSERT TO authenticated WITH CHECK (
    customer_id IN (
      SELECT c.id FROM customers c WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress
  FOR UPDATE TO authenticated USING (
    customer_id IN (
      SELECT c.id FROM customers c WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Workspace owners can view all progress
CREATE POLICY "Workspace owners can view lesson progress" ON public.lesson_progress
  FOR SELECT TO authenticated USING (
    member_content_id IN (
      SELECT mc.id FROM member_content mc
      JOIN products p ON mc.product_id = p.id
      WHERE p.workspace_id IN (
        SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to read member_content for courses they have entitlements to
CREATE POLICY "Buyers can view content of entitled products" ON public.member_content
  FOR SELECT TO authenticated USING (
    product_id IN (
      SELECT e.product_id FROM entitlements e
      JOIN customers c ON e.customer_id = c.id
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND e.revoked_at IS NULL
    )
    OR is_free = true
  );

-- Allow authenticated users to read entitled products
CREATE POLICY "Buyers can view entitled products" ON public.products
  FOR SELECT TO authenticated USING (
    id IN (
      SELECT e.product_id FROM entitlements e
      JOIN customers c ON e.customer_id = c.id
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND e.revoked_at IS NULL
    )
  );

-- Allow authenticated to read their own entitlements
CREATE POLICY "Users can view own entitlements" ON public.entitlements
  FOR SELECT TO authenticated USING (
    customer_id IN (
      SELECT c.id FROM customers c WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Allow authenticated to view their customer record
CREATE POLICY "Users can view own customer record" ON public.customers
  FOR SELECT TO authenticated USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Updated_at trigger
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
