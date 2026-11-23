-- ITACHI PERÚ CONTROL — Esquema inicial (pegar completo en Neon > SQL Editor)
create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- Una cuenta de Netflix = un grupo = un link propio (access_token)
create table if not exists service_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  service text not null default 'Netflix',
  email text not null,
  password_enc text not null,            -- AES-256-GCM, clave en ENCRYPTION_KEY
  access_token text unique not null,     -- va en el link: /c/<token>
  status text not null default 'active' check (status in ('active','suspended')),
  max_profiles int not null default 5 check (max_profiles between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_email on service_accounts (lower(email));

-- Un perfil = un cliente dentro de la cuenta
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references service_accounts(id) on delete cascade,
  profile_name text not null,
  avatar_key text not null default 'rojo',
  avatar_url text,
  client_name text not null,
  client_login text not null,            -- nombre en minúsculas para iniciar sesión
  password_hash text not null,           -- contraseña de acceso del cliente
  pin_hash text not null,                -- PIN de 4 dígitos del perfil
  status text not null default 'active' check (status in ('active','suspended')),
  price numeric(10,2),
  due_date date,
  perms jsonb not null default '{"show_email":true,"show_password":true,"show_profile":true,"btn_pin":true,"btn_link":true,"btn_code4":true,"btn_code6":true}',
  action_urls jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  unique (account_id, client_login),
  unique (account_id, profile_name)
);
create index if not exists idx_profiles_account on profiles (account_id);
create index if not exists idx_profiles_due on profiles (due_date);

-- Máximo 5 perfiles por cuenta, garantizado por la base de datos
create or replace function enforce_max_profiles() returns trigger as $$
begin
  if (select count(*) from profiles where account_id = new.account_id)
     >= (select max_profiles from service_accounts where id = new.account_id) then
    raise exception 'Esta cuenta ya tiene el máximo de perfiles';
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists trg_max_profiles on profiles;
create trigger trg_max_profiles before insert on profiles
  for each row execute function enforce_max_profiles();

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  paid_at date not null default (now() at time zone 'America/Lima')::date,
  next_due date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists login_attempts (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor text not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
