
-- Public SELECT policies for storefronts (published only)
CREATE POLICY "Public can view published storefronts"
ON public.storefronts
FOR SELECT
TO anon
USING (is_published = true);

-- Public SELECT policies for storefront_blocks (via published storefront)
CREATE POLICY "Public can view blocks of published storefronts"
ON public.storefront_blocks
FOR SELECT
TO anon
USING (storefront_id IN (
  SELECT id FROM public.storefronts WHERE is_published = true
));

-- Public SELECT policies for storefront_themes (via published storefront)
CREATE POLICY "Public can view themes of published storefronts"
ON public.storefront_themes
FOR SELECT
TO anon
USING (storefront_id IN (
  SELECT id FROM public.storefronts WHERE is_published = true
));

-- Public SELECT on products (for product cards on public storefronts)
CREATE POLICY "Public can view published products"
ON public.products
FOR SELECT
TO anon
USING (status = 'PUBLISHED' AND deleted_at IS NULL);

-- Public SELECT on prices (for product cards)
CREATE POLICY "Public can view active prices"
ON public.prices
FOR SELECT
TO anon
USING (is_active = true AND product_id IN (
  SELECT id FROM public.products WHERE status = 'PUBLISHED' AND deleted_at IS NULL
));

-- Public INSERT on analytics_events (for page views, clicks)
CREATE POLICY "Public can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Public INSERT on leads (for lead forms)
CREATE POLICY "Public can submit leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);
