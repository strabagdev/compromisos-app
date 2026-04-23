# Compromisos App

Base inicial para `compromisos-app` replicando la capa transversal de acceso de `oficina-tecnica-app`, pero dejando fuera la logica de negocio.

## Stack

- Next.js 16 App Router
- Prisma
- PostgreSQL pensado para Railway
- Supabase Auth para autenticacion
- Railway para frontend, backend y base de datos

Importante:

- `Supabase` se usa solo para autenticacion.
- `Supabase` no se usa como base de datos de la aplicacion.
- Toda la data propia de la app vive en `Railway Postgres` via `DATABASE_URL`.

## Que incluye esta base

- login con Supabase Auth
- solicitud de acceso
- aprobacion y bloqueo interno de usuarios
- administracion basica de roles
- rutas protegidas
- dashboard inicial en blanco

## Variables de entorno

Usa `.env.example` como referencia:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@empresa.cl"
```

Notas:

- `DATABASE_URL` debe apuntar al PostgreSQL de Railway.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY` corresponden a Supabase Auth.
- `ADMIN_NAME` y `ADMIN_EMAIL` se usan para bootstrap del primer administrador interno.

## Desarrollo local

```bash
npm install
npm run db:push
npm run dev
```

## Railway

1. Crea un servicio PostgreSQL en Railway.
2. Configura `DATABASE_URL` en el servicio web de la app.
3. Configura las variables de Supabase Auth en Railway:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Define `ADMIN_EMAIL` con el correo del primer administrador.
5. Railway ejecutara `npm start`, y antes correra `prestart` con `prisma db push` para sincronizar el esquema.

Si mas adelante versionamos migraciones formales, puedes usar:

```bash
npm run db:deploy
```

## Flujo esperado

1. Creas o usas un usuario existente en Supabase Auth.
2. Si su correo coincide con `ADMIN_EMAIL`, entra como administrador.
3. Ese administrador puede aprobar solicitudes, crear usuarios y gestionar accesos.
4. Cualquier usuario aprobado entra al dashboard en blanco para comenzar a construir la logica del negocio.
