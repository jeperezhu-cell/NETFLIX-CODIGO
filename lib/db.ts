import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
export const sql = neon(process.env.DATABASE_URL);
export const LIMA_TODAY = "(now() at time zone 'America/Lima')::date";
