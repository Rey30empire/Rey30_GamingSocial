# REY30VERSE on Netlify + Neon

## Estado actual

- El esquema Prisma ya fue migrado a PostgreSQL.
- El proyecto de Netlify detectado es `gamingrey30social`.
- La extension oficial `neon` ya quedo instalada en ese sitio.
- Ya se configuraron en Netlify:
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL` para `production`
  - `REY30_ENABLE_RUNTIME_SEED=false`

## Variables de entorno soportadas por la app

- `DATABASE_URL`: URL principal de PostgreSQL/Neon.
- `DIRECT_URL`: URL directa para migraciones Prisma.
- `NETLIFY_DATABASE_URL`: URL autoprovisionada por Netlify DB.
- `NETLIFY_DATABASE_DIRECT_URL`: URL directa autoprovisionada por Netlify DB si existe.
- `NETLIFY_DATABASE_URL_UNPOOLED`: URL directa sin pooler que hoy entrega la extension Neon en este sitio.
- `REY30_DATABASE_SCHEMA`: schema PostgreSQL donde vive la app. Por defecto se usa `rey30verse`.

La app usa este orden de prioridad:

1. `DATABASE_URL`
2. `NETLIFY_DATABASE_URL`

Para migraciones Prisma:

1. `DIRECT_URL`
2. `NETLIFY_DATABASE_DIRECT_URL`
3. `NETLIFY_DATABASE_URL_UNPOOLED`
4. la misma `DATABASE_URL` resuelta

## Flujo recomendado en Netlify

1. Haz un nuevo deploy o build del sitio `gamingrey30social`.
2. La extension Neon deberia provisionar la base y exponer `NETLIFY_DATABASE_URL`.
3. Verifica las variables del sitio en Netlify.
4. Si quieres usar Netlify DB administrada, no necesitas cuenta manual en Neon.
5. Si prefieres Neon externo, configura `DATABASE_URL` y `DIRECT_URL` manualmente y la app lo soporta igual.
6. Si la base provisionada no esta vacia, la app se aísla en el schema `rey30verse` para no chocar con tablas ajenas en `public`.

## Comandos del repo

- `npm run db:bootstrap`
  - Ejecuta `prisma generate` y luego `prisma migrate deploy`.
- `npm run db:migrate`
  - Ejecuta `prisma migrate dev` usando `DATABASE_URL` o el fallback de Netlify DB.
- `npm run db:push`
  - Ejecuta `prisma db push` usando `DATABASE_URL` o el fallback de Netlify DB.
- `netlify.toml`
  - Fija `NODE_VERSION=22` y hace que Netlify ejecute `npm run db:bootstrap && npm run build`.

## Datos demo

- El seed automatico ya no corre en produccion por defecto.
- Si quieres una preview demo, activa `REY30_ENABLE_RUNTIME_SEED=true`.
- Para produccion real, mantenlo en `false`.

## Auth

- `NEXTAUTH_SECRET` es obligatorio en produccion.
- `NEXTAUTH_URL` debe apuntar al dominio publico final del sitio.
- Las credenciales demo ya no se muestran si el seed runtime esta desactivado.
