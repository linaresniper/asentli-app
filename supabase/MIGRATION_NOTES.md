# Asentli — expenses / budgets / user_profile setup (for the backend/DB owner)

The mobile app records **manual expenses**, a **monthly budget**, and now a
small **profile extra** (phone) — all keyed by the **Clerk user id** (auth
lives in Clerk, not Supabase Auth).

Two SQL files, same rules for both:

- `expenses_budgets.sql` → creates `public.expenses` and `public.budgets`.
- `user_profile.sql` → creates `public.user_profile` (just `user_id` + `phone`).

---

## About the `ERROR: 42P07: relation "usuario" already exists`

**Neither script creates a `usuario` table.** Each one only does
`create table if not exists` for its own table(s) and touches nothing else —
the word `usuario` appears only inside comments, explaining why these tables
are separate from it.

The `usuario` table is **yours** — it was already in the project before any of
this work (columns: `id_usuario, nombre, apellido, correo, telefono,
contrasena, estado, fecha_registro`). It must not be touched.

If you see that error, something replayed a script that does
`create table ... usuario` — almost certainly **`supabase db push` / `supabase
migration up` replaying your own initial migration** because it isn't marked as
applied in the remote migration history. See Option B below.

---

## How to run them (pick ONE)

### Option A — SQL Editor (simplest, recommended)

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Paste the **entire** contents of `supabase/expenses_budgets.sql` → Run.
3. New query again → paste `supabase/user_profile.sql` → Run.

Both are idempotent — safe to run again if needed. Don't use the CLI for these.

### Option B — Supabase CLI

Only if your existing schema is already tracked in `supabase/migrations/`.
If `usuario`/`compra`/etc. were created in the dashboard (not via migrations),
first tell the CLI they're already there so it doesn't try to recreate them:

```bash
# mark every existing migration as already applied
supabase migration list                     # see local vs remote
supabase migration repair --status applied <version>   # for each existing one

# then move both .sql files into supabase/migrations/ with timestamp names
# e.g. 20260829180000_expenses_budgets.sql, 20260912170000_user_profile.sql
supabase db push
```

If you're not sure, **use Option A.**

---

## Then: enable the Clerk → Supabase integration (one-time, ~3 min)

Without this, every request from the app returns 401 and the screens stay empty.
(Skip if your team already did this for `expenses`/`budgets` — it's the same
integration, `user_profile` doesn't need anything extra.)

1. **Clerk Dashboard → Configure → Integrations → Supabase → Activate.**
   Copy the **Clerk domain** it shows
   (current dev instance: `helped-tick-1718.clerk.accounts.dev`).
   This makes Clerk session tokens include `"role": "authenticated"`.
2. **Supabase Dashboard → Authentication → Sign In / Providers →
   Third-Party Auth → Add provider → Clerk**, paste that domain.
   - CLI equivalent in `supabase/config.toml`:
     ```toml
     [auth.third_party.clerk]
     enabled = true
     domain  = "helped-tick-1718.clerk.accounts.dev"
     ```

---

## How rows are scoped to a user

- Every row carries `user_id text` = Clerk's `user.id` (e.g. `user_2abc…`).
- The app sends the Clerk session token as the Supabase access token, so inside
  Postgres `auth.jwt() ->> 'sub'` is that same id.
- RLS policies (`… using ((select auth.jwt() ->> 'sub') = user_id)`) enforce it;
  the app also filters/sets `user_id` explicitly.

## Verify (after everything above)

```sql
-- should be 3 rows, all with rowsecurity = true
select relname, relrowsecurity from pg_class
where relname in ('expenses','budgets','user_profile');

-- should be 10 rows
select tablename, policyname, cmd from pg_policies
where tablename in ('expenses','budgets','user_profile') order by 1,3;
```

Then in the app: sign in → add an expense → it appears on Home / Statistics /
Purchase History. Change your phone in "Edit Profile" → it appears in
`user_profile` in the Table Editor. Both show up with your Clerk `user_id`.

## Naming note

These tables use English snake_case (`expenses`, `spent_at`, `user_profile`)
while the rest of the schema is Spanish (`compra`, `fecha_compra`). If the
team prefers `gasto` / `presupuesto` / `perfil_usuario`, say so and we'll
rename before there's real data.
