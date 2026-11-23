<<<<<<< HEAD
# ITACHI PERÚ CONTROL

Next.js 15 (App Router) + TypeScript + Tailwind + Neon PostgreSQL + Vercel.

## Flujo del cliente
`/c/<link-de-la-cuenta>` → nombre + contraseña → elegir perfil → PIN de 4 dígitos → panel.
Cada cuenta (1 Netflix) tiene su propio link y hasta 5 perfiles (límite aplicado también en la base de datos).

## Puesta en marcha
1. `npm install`
2. Copia `.env.example` a `.env.local` y complétalo.
3. En Neon > SQL Editor, pega y ejecuta `db/schema.sql`.
4. `npm run create-admin -- miUsuario miContraseñaLarga123`
5. `npm run dev` → http://localhost:3000

## Portada
Reemplaza `public/image.png` y haz push: Vercel la publica sola.

## Despliegue
GitHub (repo `itachi-peru-control`) → Vercel > Import → agrega las variables de `.env.example` → Deploy.
=======
# NETFLIX-CODIGO
>>>>>>> 43b9377101fd041ace17965cc97beee31c1e6b89
