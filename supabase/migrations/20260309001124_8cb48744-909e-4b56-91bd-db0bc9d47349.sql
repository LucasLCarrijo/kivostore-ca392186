-- Create enum for workspace member roles
CREATE TYPE public.workspace_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Create workspaces table
CREATE TABLE public.workspaces (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    currency TEXT NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE public.workspace_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, workspace_id)
);

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_members
CREATE POLICY "Users can view their own workspace memberships"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace memberships"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace memberships"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update workspaces where they are OWNER or ADMIN"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = auth.uid() 
        AND role IN ('OWNER', 'ADMIN')
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on workspaces
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique slug from name
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
$$ LANGUAGE plpgsql;

-- Function to automatically create workspace and membership on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
    user_email TEXT;
    workspace_name TEXT;
    workspace_slug TEXT;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
    
    -- Create workspace name from email (before @ symbol)
    workspace_name := split_part(user_email, '@', 1) || '''s Workspace';
    
    -- Generate unique slug
    workspace_slug := public.generate_unique_slug(workspace_name);
    
    -- Create workspace
    INSERT INTO public.workspaces (name, slug)
    VALUES (workspace_name, workspace_slug)
    RETURNING id INTO new_workspace_id;
    
    -- Create workspace membership with OWNER role
    INSERT INTO public.workspace_members (user_id, workspace_id, role)
    VALUES (NEW.id, new_workspace_id, 'OWNER');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to handle new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();