-- Adicionar coluna metadata JSONB à tabela workspaces para armazenar plano e outras configurações
ALTER TABLE public.workspaces 
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;