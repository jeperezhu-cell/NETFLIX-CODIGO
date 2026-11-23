-- Migración 03: nuevo botón CÓDIGO INICIO DE SESIÓN (pegar en Neon > SQL Editor)
update profiles set perms = perms || '{"btn_login":true}'::jsonb where not (perms ? 'btn_login');
alter table profiles alter column perms set default
 '{"show_email":true,"show_password":true,"show_profile":true,"btn_pin":true,"btn_link":true,"btn_code4":true,"btn_code6":true,"btn_login":true}';
