-- ITACHI PERÚ CONTROL — Migración 02 (pegar completo en Neon > SQL Editor)
alter table profiles add column if not exists prefs jsonb not null default '{"general":true,"payments":true,"admin":true}';

create table if not exists system_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  description text, filename text not null, mime text not null, size int not null,
  data bytea not null, created_at timestamptz not null default now()
);
create index if not exists idx_receipts_profile on receipts (profile_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null, title text not null, body text not null,
  push_sent int not null default 0, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_notif_profile on notifications (profile_id, created_at desc);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text unique not null, p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);

-- Evita recordatorios duplicados: un aviso por perfil, vencimiento y tipo
create table if not exists reminder_log (
  profile_id uuid not null references profiles(id) on delete cascade,
  due_date date not null, kind text not null, sent_at timestamptz not null default now(),
  primary key (profile_id, due_date, kind)
);
