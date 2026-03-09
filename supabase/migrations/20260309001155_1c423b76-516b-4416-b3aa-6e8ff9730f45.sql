-- Fix search_path for generate_unique_slug function
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert name to slug format (lowercase, replace spaces/special chars with hyphens)
    base_slug := lower(regexp_replace(regexp_replace(base_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
    final_slug := base_slug;
    
    -- Check if slug exists and increment counter if needed
    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql SET search_path = public;