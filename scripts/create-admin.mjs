// Uso: npm run create-admin -- tuUsuario tuContraseñaLarga
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 10) {
  console.error("Uso: npm run create-admin -- <usuario> <contraseña de 10+ caracteres>"); process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const hash = await bcrypt.hash(password, 12);
await sql`insert into app_users (username, password_hash) values (${username}, ${hash})
  on conflict (username) do update set password_hash = excluded.password_hash`;
console.log(`Administrador "${username}" listo.`);
