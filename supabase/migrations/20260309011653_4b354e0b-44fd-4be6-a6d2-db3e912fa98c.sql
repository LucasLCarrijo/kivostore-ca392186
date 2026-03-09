-- Create storefront_blocks table
CREATE TABLE public.storefront_blocks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to storefront_themes
ALTER TABLE public.storefront_themes 
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1a1a1a',
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#1a1a1a',
ADD COLUMN IF NOT EXISTS font_heading TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS font_body TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS button_style TEXT DEFAULT 'rounded',
ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Add social_links column to storefronts
ALTER TABLE public.storefronts
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on storefront_blocks
ALTER TABLE public.storefront_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storefront_blocks
CREATE POLICY "Users can view blocks of storefronts in their workspaces"
ON public.storefront_blocks
FOR SELECT
USING (
    storefront_id IN (
        SELECT storefronts.id FROM storefronts
        WHERE storefronts.workspace_id IN (
            SELECT workspace_members.workspace_id FROM workspace_members
            WHERE workspace_members.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert blocks for storefronts in their workspaces"
ON public.storefront_blocks
FOR INSERT
WITH CHECK (
    storefront_id IN (
        SELECT storefronts.id FROM storefronts
        WHERE storefronts.workspace_id IN (
            SELECT workspace_members.workspace_id FROM workspace_members
            WHERE workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('OWNER', 'ADMIN')
        )
    )
);

CREATE POLICY "Users can update blocks of storefronts in their workspaces"
ON public.storefront_blocks
FOR UPDATE
USING (
    storefront_id IN (
        SELECT storefronts.id FROM storefronts
        WHERE storefronts.workspace_id IN (
            SELECT workspace_members.workspace_id FROM workspace_members
            WHERE workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('OWNER', 'ADMIN')
        )
    )
);

CREATE POLICY "Users can delete blocks of storefronts in their workspaces"
ON public.storefront_blocks
FOR DELETE
USING (
    storefront_id IN (
        SELECT storefronts.id FROM storefronts
        WHERE storefronts.workspace_id IN (
            SELECT workspace_members.workspace_id FROM workspace_members
            WHERE workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('OWNER', 'ADMIN')
        )
    )
);

-- Create updated_at trigger for storefront_blocks
CREATE TRIGGER update_storefront_blocks_updated_at
    BEFORE UPDATE ON public.storefront_blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();