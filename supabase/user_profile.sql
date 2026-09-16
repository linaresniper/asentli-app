-- ============================================================================
-- Asentli — user_profile  (app data that Clerk doesn't manage, per user)
-- ============================================================================
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and press Run.
--             Same rule as expenses_budgets.sql — don't run it through
--             `supabase db push` unless your existing schema is already
--             recorded in migration history (see MIGRATION_NOTES.md).
--
-- WHAT THIS CREATES:  exactly one table — public.user_profile.
-- WHAT THIS TOUCHES:  nothing else. It does NOT create, alter or drop
--                     `usuario` (or compra, billetera, transaccion, cashback,
--                     comercio, producto, detalle_compra, lista_compra,
--                     direccion). `usuario` has no Clerk link, so this table
--                     exists instead — same reasoning as `expenses`/`budgets`.
--
-- WHY: Clerk already manages name, email and profile photo. This table is
-- only for the one field Clerk doesn't manage that the app needs: phone.
-- Keyed by the Clerk user id, exactly like `budgets`.
--
-- Safe to run more than once (guarded with `if not exists` / `drop policy
-- if exists`).
-- ============================================================================

create table if not exists public.user_profile (
  user_id     text primary key,                  -- Clerk user id ("user_xxx")
  phone       text,
  updated_at  timestamptz not null default now()
);

alter table public.user_profile enable row level security;

grant select, insert, update on public.user_profile to authenticated;

drop policy if exists user_profile_select_own on public.user_profile;
create policy user_profile_select_own on public.user_profile
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists user_profile_insert_own on public.user_profile;
create policy user_profile_insert_own on public.user_profile
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists user_profile_update_own on public.user_profile;
create policy user_profile_update_own on public.user_profile
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- ------------------------------------------------------------------- verify
--   select relname, relrowsecurity from pg_class where relname = 'user_profile';
--   select policyname, cmd from pg_policies where tablename = 'user_profile';
