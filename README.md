# Sistema Pollo

App web mobile-first para el negocio de pollo en pie (Bolivia): compra en Santa Cruz / Mairana / Cochabamba → faena → consignación y cobro en La Paz / El Alto.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres + RLS) · deploy en **Vercel**.

---

## Qué incluye

- Auth real: login email/password, logout, middleware de sesión, rutas `(app)` protegidas
- Roles desde `profiles.role`: vendedora (solo pagos), admin (todo), superadmin (+ Usuarios / reset password)
- Shell mobile-first + placeholders de módulos
- Migración SQL (`supabase/migrations/001_initial_schema.sql`) — **Ervin ya la aplicó**
- `.env.local.example` (placeholders; nunca commits de keys reales)

Checklist corto: Agent Store → `docs/supabase-checklist.md`

---

## 1. Supabase (estado actual)

| Paso | Estado |
|------|--------|
| Proyecto creado | ✅ |
| Migración `001_initial_schema.sql` | ✅ |
| Env vars en `.env.local` / Vercel | ⬜ tú |
| Primer `superadmin` en `profiles` | ⬜ tú |

### Primer superadmin

1. **Authentication → Users → Add user** (email + password).
2. Si “Confirm email” bloquea el login en dev: desactívalo en Auth → Providers → Email, o confirma el correo.
3. **Table Editor → profiles** → ese usuario → `role = superadmin`.

### Auth URLs

**Authentication → URL Configuration**

- Site URL = URL de Vercel (o `http://localhost:3000`)
- Redirect URLs = `http://localhost:3000/**` y `https://TU-APP.vercel.app/**`

---

## 2. Variables de entorno

De Supabase → **Project Settings → API** (no las pegues en chat):

| Name | Dónde |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + Vercel (Sensitive) |
| `NEXT_PUBLIC_APP_URL` | local `http://localhost:3000` / URL Vercel |
| `NEXT_PUBLIC_BUSINESS_TZ` | `America/La_Paz` (opcional) |

Sin keys configuradas, la app redirige a `/login?setup=1` (el build sigue pasando).

---

## 3. Local

```bash
cp .env.local.example .env.local
# pega tus keys
npm install
npm run dev
```

1. `http://localhost:3000` → redirige a `/login` si no hay sesión.
2. Login superadmin → dashboard + menú completo (incl. Usuarios).
3. **Salir** cierra sesión.
4. Usuario `vendedora` → solo `/pagos`.

---

## 4. Vercel

1. Importa el repo → preset Next.js (sin `vercel.json`).
2. Carga las env vars (Production + Preview) → Deploy.
3. Configura Site URL / Redirect URLs en Supabase.
4. Tras cambiar env: **Redeploy**.

---

## 5. Roles

| Rol | Acceso |
|-----|--------|
| `vendedora` | Solo registrar pagos |
| `admin` | Dashboard + todos los módulos excepto Usuarios |
| `superadmin` | Todo + `/usuarios` (reset password) |

La UI oculta menús; middleware + RLS refuerzan el acceso.

---

## 6. Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo |
| `npm run build` | Build (Vercel) |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |

---

## 7. Estructura

```
src/middleware.ts          → sesión + redirects auth/rol
src/app/login/             → login
src/app/(app)/             → shell protegido
src/app/actions/           → logout, reset password
src/lib/supabase/          → client / server / admin / middleware helper
src/lib/auth/              → sesión + permisos
supabase/migrations/
.env.local.example
```

---

## Próximos pasos producto

1. Ervin: env vars + superadmin + probar login (checklist).
2. Sprint datos: Proveedores → Compras (precio diferido) → Pagos.
3. Clientes / consignación + recibos.
4. Inventario + PDFs.
