-- Migración 04 (pegar completo en Neon > SQL Editor y ejecutar UNA vez)
-- Permite que el administrador vea/edite la contraseña y el PIN de cada cliente (se guardan cifrados con ENCRYPTION_KEY).
alter table profiles add column if not exists client_password_enc text;
alter table profiles add column if not exists pin_enc text;
alter table service_accounts add column if not exists notes text;
create index if not exists idx_push_profile on push_subscriptions (profile_id);

-- Por si nunca se ejecutaron las migraciones 02 y 03 (no hace daño si ya están):
alter table profiles add column if not exists prefs jsonb not null default '{"general":true,"payments":true,"admin":true}';
update profiles set perms = perms || '{"btn_login":true}'::jsonb where not (perms ? 'btn_login');
