-- ============================================================================
-- Asentli — catálogo: stores, products, store_products, price_history
-- ============================================================================
-- HOW TO RUN: pegá este archivo entero en el SQL Editor de Supabase y Run.
--             Misma regla que expenses_budgets.sql / user_profile.sql: no lo
--             corras con `supabase db push` salvo que el esquema existente ya
--             esté en el historial de migraciones (ver MIGRATION_NOTES.md).
--
-- WHAT THIS CREATES: 4 tablas — public.stores, public.products,
--                    public.store_products, public.price_history.
--
-- WHAT THIS TOUCHES: nada más. NO crea, altera ni borra las tablas heredadas
--                    del modelo viejo (comercio, producto, compra,
--                    detalle_compra, lista_compra, billetera, transaccion,
--                    cashback, direccion, usuario). Son otro mundo: su esquema
--                    real no está en el repo y no están conectadas a Clerk.
--                    Ver DATABASE.md sección 4.
--
-- ⚠️  CAMBIO DE PATRÓN RESPECTO A LAS TABLAS QUE YA EXISTÍAN
-- `expenses`, `budgets` y `user_profile` son privadas: cada fila tiene un
-- `user_id` y la RLS dice "solo lo tuyo". Estas cuatro son lo contrario:
-- son CATÁLOGO COMPARTIDO. Todo usuario logueado las lee enteras; nadie las
-- escribe desde la app. La escritura queda reservada al rol `admin`, que
-- viaja en el JWT de Clerk como `public_metadata.role`. No copies la política
-- de `expenses` acá: no hay dueño por fila.
--
-- EL CONTENIDO DE `products` NO ES ARBITRARIO: son los 22 artículos de la
-- Canasta Básica Alimentaria oficial de El Salvador (BCR/ONEC). De dónde
-- salió exactamente cada fila, con fuente y fecha, está en CATALOG.md en la
-- raíz del repo. Si agregás productos que no son CBA, actualizá ese documento
-- o dejará de ser cierto.
--
-- Seguro de correr más de una vez (`if not exists`, `drop policy if exists`,
-- y los seeds usan `on conflict do nothing`).
-- ============================================================================


-- ============================================================================
-- 0. Helper: ¿el que llama es admin?
-- ============================================================================
-- El rol vive en Clerk (publicMetadata.role) y viaja dentro del mismo JWT que
-- ya usamos para `auth.jwt() ->> 'sub'`. Clerk serializa publicMetadata como
-- `public_metadata` en el token.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'public_metadata' ->> 'role', '') = 'admin';
$$;


-- ============================================================================
-- 1. stores — comercios afiliados
-- ============================================================================
create table if not exists public.stores (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,            -- 'super-selectos', estable para código
  name          text not null,
  category      text not null default 'supermercado',
  cashback_pct  numeric(4,2) not null default 0  -- 5.00 = 5 %
                check (cashback_pct >= 0 and cashback_pct <= 100),
  logo_url      text,
  address       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);


-- ============================================================================
-- 2. products — catálogo. SOLO Canasta Básica Alimentaria (ver CATALOG.md)
-- ============================================================================
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,            -- 'frijol-rojo-de-seda'
  name          text not null,                   -- en español (decisión del equipo)
  unit          text not null,                   -- 'Libra', 'Unidad', 'Litro'…
  category      text not null
                check (category in ('food', 'dairy', 'meat', 'other')),
  -- Trazabilidad CBA. `cba_group` es uno de los 11 grupos oficiales del BCR;
  -- `in_cba_rural` marca los 15 que también están en la canasta rural (la
  -- rural excluye Pan Francés y las 6 verduras). Ver CATALOG.md.
  cba_group     text not null
                check (cba_group in (
                  'Pan Francés', 'Tortillas', 'Arroz', 'Carnes', 'Grasas',
                  'Huevos', 'Leche Fluida', 'Frutas', 'Frijoles', 'Verduras',
                  'Azúcar'
                )),
  in_cba_rural  boolean not null default false,
  barcode       text,                            -- EAN; puente a Open Food Facts
  image_url     text,                            -- Supabase Storage u OFF
  icon          text,                            -- Ionicons, mientras no haya foto
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_cba_group_idx on public.products (cba_group);


-- ============================================================================
-- 3. store_products — el precio de un producto en un comercio
-- ============================================================================
-- Es el corazón del comparador. PK compuesta: un precio por (comercio,
-- producto). El histórico vive aparte, en price_history.
create table if not exists public.store_products (
  store_id    uuid not null references public.stores (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  price       numeric(10,2) not null check (price > 0),
  currency    text not null default 'USD',
  in_stock    boolean not null default true,
  source      text not null default 'manual'
              check (source in ('manual', 'merchant', 'import', 'official')),
  updated_by  text,                              -- Clerk user id de quien cargó
  updated_at  timestamptz not null default now(),
  primary key (store_id, product_id)
);

create index if not exists store_products_product_idx
  on public.store_products (product_id, price);


-- ============================================================================
-- 4. price_history — para "bajó 12 % este mes"
-- ============================================================================
create table if not exists public.price_history (
  id           bigserial primary key,
  store_id     uuid not null references public.stores (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  price        numeric(10,2) not null check (price > 0),
  recorded_at  timestamptz not null default now()
);

create index if not exists price_history_lookup_idx
  on public.price_history (store_id, product_id, recorded_at desc);

-- Cada vez que cambia un precio queda la foto anterior. Así el histórico se
-- llena solo: ni la app ni el panel tienen que acordarse de escribirlo.
create or replace function public.log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.price is not distinct from old.price then
    return new;
  end if;
  insert into public.price_history (store_id, product_id, price, recorded_at)
  values (new.store_id, new.product_id, new.price, now());
  return new;
end;
$$;

drop trigger if exists store_products_price_history on public.store_products;
create trigger store_products_price_history
  after insert or update of price on public.store_products
  for each row execute function public.log_price_change();


-- ============================================================================
-- 5. RLS — lectura para cualquier logueado, escritura solo admin
-- ============================================================================
alter table public.stores          enable row level security;
alter table public.products        enable row level security;
alter table public.store_products  enable row level security;
alter table public.price_history   enable row level security;

grant select on public.stores, public.products,
                public.store_products, public.price_history to authenticated;
grant insert, update, delete on public.stores, public.products,
                                public.store_products to authenticated;

-- price_history no se escribe desde ningún cliente: solo la llena el trigger.

-- ---------- lectura ----------
drop policy if exists stores_select_all on public.stores;
create policy stores_select_all on public.stores
  for select to authenticated using (true);

drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select to authenticated using (true);

drop policy if exists store_products_select_all on public.store_products;
create policy store_products_select_all on public.store_products
  for select to authenticated using (true);

drop policy if exists price_history_select_all on public.price_history;
create policy price_history_select_all on public.price_history
  for select to authenticated using (true);

-- ---------- escritura: solo admin ----------
drop policy if exists stores_write_admin on public.stores;
create policy stores_write_admin on public.stores
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_write_admin on public.products;
create policy products_write_admin on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists store_products_write_admin on public.store_products;
create policy store_products_write_admin on public.store_products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- 6. Semilla — comercios
-- ============================================================================
-- Los 4 que ya aparecían escritos a mano en las pantallas. Los % de cashback
-- son los que estaban en el mock de AffiliatedBusinessesScreen: son de
-- EJEMPLO, no hay contrato de afiliación firmado detrás. Reemplazalos por los
-- reales antes de mostrarlos como promesa al usuario.
insert into public.stores (slug, name, category, cashback_pct) values
  ('super-selectos',   'Súper Selectos',      'supermercado', 5.00),
  ('despensa-familiar','La Despensa Familiar','supermercado', 4.00),
  ('maxi-despensa',    'Maxi Despensa',       'supermercado', 4.00),
  ('walmart',          'Walmart',             'supermercado', 3.00)
on conflict (slug) do nothing;


-- ============================================================================
-- 7. Semilla — los 22 productos de la CBA urbana
-- ============================================================================
-- Fuente, fecha y reconstrucción: CATALOG.md. NO agregar acá productos que no
-- sean CBA sin actualizar ese documento.
--   in_cba_rural = false  →  Pan Francés y las 6 verduras (los 7 que la
--                            canasta rural excluye). 22 - 7 = 15. ✓
insert into public.products (slug, name, unit, category, cba_group, in_cba_rural, icon) values
  ('pan-frances',          'Pan francés',         'Unidad', 'food',  'Pan Francés',  false, 'nutrition'),
  ('tortillas-de-maiz',    'Tortillas de maíz',   'Paquete','food',  'Tortillas',    true,  'nutrition'),
  ('arroz',                'Arroz',               'Libra',  'food',  'Arroz',        true,  'nutrition'),
  ('carne-de-res',         'Carne de res',        'Libra',  'meat',  'Carnes',       true,  'restaurant'),
  ('carne-de-cerdo',       'Carne de cerdo',      'Libra',  'meat',  'Carnes',       true,  'restaurant'),
  ('pollo',                'Pollo',               'Libra',  'meat',  'Carnes',       true,  'restaurant'),
  ('aceite',               'Aceite',              'Botella 750 ml', 'food', 'Grasas', true, 'water'),
  ('margarina',            'Margarina',           'Libra',  'food',  'Grasas',       true,  'cafe'),
  ('huevos',               'Huevos',              'Unidad', 'food',  'Huevos',       true,  'ellipse'),
  ('leche-fluida',         'Leche fluida',        'Litro',  'dairy', 'Leche Fluida', true,  'cafe'),
  ('guineo',               'Guineo',              'Libra',  'food',  'Frutas',       true,  'nutrition'),
  ('platano',              'Plátano',             'Unidad', 'food',  'Frutas',       true,  'nutrition'),
  ('naranja',              'Naranja',             'Unidad', 'food',  'Frutas',       true,  'nutrition'),
  ('guisquil',             'Güisquil',            'Unidad', 'food',  'Verduras',     false, 'leaf'),
  ('papa',                 'Papa',                'Libra',  'food',  'Verduras',     false, 'leaf'),
  ('cebolla',              'Cebolla',             'Libra',  'food',  'Verduras',     false, 'leaf'),
  ('tomate',               'Tomate',              'Libra',  'food',  'Verduras',     false, 'leaf'),
  ('repollo',              'Repollo',             'Unidad', 'food',  'Verduras',     false, 'leaf'),
  ('chile-verde',          'Chile verde',         'Unidad', 'food',  'Verduras',     false, 'leaf'),
  ('frijol-rojo-de-seda',  'Frijol rojo de seda', 'Libra',  'food',  'Frijoles',     true,  'nutrition'),
  ('frijol-rojo-tinto',    'Frijol rojo tinto',   'Libra',  'food',  'Frijoles',     true,  'nutrition'),
  ('azucar',               'Azúcar',              'Libra',  'food',  'Azúcar',       true,  'nutrition')
on conflict (slug) do nothing;


-- ============================================================================
-- 8. Semilla — precios de ejemplo
-- ============================================================================
-- ⚠️  ESTOS PRECIOS SON INVENTADOS, SOLO PARA QUE LAS PANTALLAS TENGAN ALGO
--     QUE MOSTRAR MIENTRAS NO HAYA CARGA REAL. No son precios de mercado y no
--     deben mostrarse a un usuario final como si lo fueran. Borralos con:
--       delete from public.store_products where source = 'manual';
--     apenas entren precios de verdad.
insert into public.store_products (store_id, product_id, price, source)
select s.id, p.id, v.price, 'manual'
from (values
  ('super-selectos',    'arroz',               0.95),
  ('super-selectos',    'frijol-rojo-de-seda', 1.35),
  ('super-selectos',    'leche-fluida',        1.25),
  ('super-selectos',    'huevos',              0.22),
  ('super-selectos',    'pollo',               1.65),
  ('super-selectos',    'azucar',              0.75),
  ('super-selectos',    'aceite',              2.60),
  ('despensa-familiar', 'arroz',               0.89),
  ('despensa-familiar', 'frijol-rojo-de-seda', 1.20),
  ('despensa-familiar', 'leche-fluida',        1.15),
  ('despensa-familiar', 'huevos',              0.20),
  ('despensa-familiar', 'pollo',               1.55),
  ('despensa-familiar', 'azucar',              0.72),
  ('despensa-familiar', 'aceite',              2.35),
  ('maxi-despensa',     'arroz',               0.92),
  ('maxi-despensa',     'frijol-rojo-de-seda', 1.28),
  ('maxi-despensa',     'leche-fluida',        1.19),
  ('maxi-despensa',     'huevos',              0.21),
  ('maxi-despensa',     'pollo',               1.60),
  ('maxi-despensa',     'aceite',              2.45),
  ('walmart',           'arroz',               0.88),
  ('walmart',           'frijol-rojo-de-seda', 1.25),
  ('walmart',           'leche-fluida',        1.10),
  ('walmart',           'huevos',              0.19),
  ('walmart',           'pollo',               1.58),
  ('walmart',           'azucar',              0.70),
  ('walmart',           'aceite',              2.40)
) as v(store_slug, product_slug, price)
join public.stores   s on s.slug = v.store_slug
join public.products p on p.slug = v.product_slug
on conflict (store_id, product_id) do nothing;


-- ------------------------------------------------------------------- verify
--   select count(*) from public.products;                        -- 22
--   select count(*) from public.products where in_cba_rural;     -- 15
--   select cba_group, count(*) from public.products group by 1 order by 1;
--   select relname, relrowsecurity from pg_class
--     where relname in ('stores','products','store_products','price_history');
--   select tablename, policyname, cmd from pg_policies
--     where tablename in ('stores','products','store_products','price_history');
