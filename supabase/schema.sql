-- ============================================================
-- Cofradía Brew · esquema para Supabase
-- Pega TODO esto en Supabase → SQL Editor → Run (una sola vez)
-- ============================================================

-- 1) Tablas ------------------------------------------------
create table if not exists public.inventory (
  id         uuid primary key,
  name       text    not null,
  cat        text    not null default 'Otro',
  unit       text    not null default 'u',
  qty        numeric not null default 0,
  cost       numeric not null default 0,
  min        numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id         uuid primary key,
  name       text    not null,
  date       date    not null,
  place      text    default '',
  price      numeric not null default 0,
  used       jsonb   not null default '[]'::jsonb,
  extras     jsonb   not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) Seguridad: nadie sin sesión puede leer ni escribir ---
alter table public.inventory enable row level security;
alter table public.events    enable row level security;

drop policy if exists "auth_all_inventory" on public.inventory;
create policy "auth_all_inventory" on public.inventory
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_events" on public.events;
create policy "auth_all_events" on public.events
  for all to authenticated using (true) with check (true);

-- 3) Inventario inicial (opcional, puedes borrar este bloque) ---
insert into public.inventory (id, name, cat, unit, qty, cost, min) values
  (gen_random_uuid(), 'Café en grano',    'Café',   'g',  0, 0, 0),
  (gen_random_uuid(), 'Leche entera',     'Leche',  'ml', 0, 0, 0),
  (gen_random_uuid(), 'Leche de avena',   'Leche',  'ml', 0, 0, 0),
  (gen_random_uuid(), 'Matcha ceremonial','Matcha', 'g',  0, 0, 0),
  (gen_random_uuid(), 'Syrup vainilla',   'Syrup',  'ml', 0, 0, 0),
  (gen_random_uuid(), 'Syrup lavanda',    'Syrup',  'ml', 0, 0, 0),
  (gen_random_uuid(), 'Vasos 12oz',       'Otro',   'u',  0, 0, 0);
