# Access Template App

Plantilla base para crear aplicaciones internas con autenticacion, solicitud de
acceso, aprobacion administrativa y gestion simple de usuarios.

## Stack

- Next.js 16 App Router
- Prisma
- PostgreSQL
- Supabase Auth para autenticacion

Importante:

- Supabase se usa solo para autenticacion.
- Supabase no se usa como base de datos de la aplicacion.
- La data propia de la app vive en PostgreSQL via `DATABASE_URL`.

## Que incluye

- login con Supabase Auth
- solicitud de acceso sin contrasena
- aprobacion o rechazo de solicitudes
- creacion de cuenta Auth con contrasena temporal cuando el usuario no existe
- vinculacion de usuarios que ya existen en Supabase Auth
- bloqueo interno de usuarios
- administracion basica de roles
- eliminacion del acceso interno sin borrar la cuenta compartida de Supabase Auth
- rutas protegidas
- dashboard inicial en blanco

## Variables de entorno

Usa `.env.example` como referencia:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@ejemplo.com"
```

Notas:

- `DATABASE_URL` debe apuntar al PostgreSQL de la aplicacion.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y
  `SUPABASE_SERVICE_ROLE_KEY` corresponden al proyecto de Supabase Auth.
- `ADMIN_NAME` y `ADMIN_EMAIL` se usan para crear o reconocer al primer
  administrador interno.

## Desarrollo local

```bash
npm install
npm run db:push
npm run dev
```

## Produccion

1. Crea una base de datos PostgreSQL.
2. Configura `DATABASE_URL` en el servicio donde despliegues la app.
3. Configura las variables de Supabase Auth.
4. Define `ADMIN_EMAIL` con el correo del primer administrador.
5. Ejecuta `npm run build` y luego `npm start`.

El script `prestart` ejecuta `prisma db push` antes de iniciar la app para
sincronizar el esquema. Si mas adelante versionas migraciones formales, puedes
usar:

```bash
npm run db:deploy
```

## Flujo esperado

1. El primer administrador entra con el correo configurado en `ADMIN_EMAIL`.
2. Los usuarios solicitan acceso con nombre y correo.
3. El administrador aprueba o rechaza solicitudes.
4. Si el usuario ya existe en Supabase Auth, conserva su contrasena actual.
5. Si el usuario no existe en Supabase Auth, el administrador define una
   contrasena temporal al aprobar.
6. Los usuarios aprobados entran al dashboard en blanco para comenzar a montar
   la logica propia de la aplicacion.
