# Lovable / Supabase SQL Prompt — Circles Discovery + Join Applications

Use este SQL no Lovable para criar as tabelas necessárias para os novos fluxos de circles:

```sql
-- 1) Discovery metadata por comunidade
create table if not exists public.community_discovery_meta (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null unique references public.communities(id) on delete cascade,
  is_discoverable boolean not null default true,
  category text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_discovery_meta_discoverable
  on public.community_discovery_meta(is_discoverable);

create index if not exists idx_community_discovery_meta_category
  on public.community_discovery_meta(category);

-- 2) Perguntas de entrada
create table if not exists public.community_join_questions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  question text not null,
  required boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_join_questions_community_position
  on public.community_join_questions(community_id, position);

-- 3) Aplicações de entrada (respostas)
create table if not exists public.community_join_applications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  member_id uuid not null references public.community_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING',
  answers jsonb not null default '[]'::jsonb,
  invite_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists idx_community_join_applications_community_status
  on public.community_join_applications(community_id, status);

create index if not exists idx_community_join_applications_member
  on public.community_join_applications(member_id);
```

## RLS (mínimo recomendado)

- `community_discovery_meta`: leitura pública, escrita só owner/admin da comunidade.
- `community_join_questions`: leitura pública, escrita só owner/admin.
- `community_join_applications`:
  - insert: usuário autenticado criando a própria aplicação
  - select/update: apenas owner/admin/moderator da comunidade

Se quiser, posso te mandar também um bloco pronto de políticas RLS.
