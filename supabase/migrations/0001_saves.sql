-- Save da família na nuvem: um registro por conta (e-mail do responsável).
-- O conteúdo é o mesmo JSON do save local (jogadores, heróis, conquistas, progresso).

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null,
  versao integer not null default 1,
  atualizado_em timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Cada conta só enxerga e altera o próprio save.
create policy "dono lê o próprio save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "dono cria o próprio save" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "dono atualiza o próprio save" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
