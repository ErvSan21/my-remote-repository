# Sistema Pollo

App web mobile-first para el negocio de pollo en pie (Bolivia): compra en Santa Cruz / Mairana / Cochabamba → faena → consignación y cobro en La Paz / El Alto.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres + RLS) · deploy en **Vercel**.

Plan de producto: ver el documento del proyecto en el Agent Store (`docs/sistema-pollo-plan.md`) o la sección de setup abajo.

---

## Qué incluye este scaffold

- Shell mobile-first: login, dashboard placeholder, navegación a Proveedores, Compras, Pagos, Clientes/Consignación, Inventario, Cierres/PDF, Usuarios
- Clientes Supabase stubs (`src/lib/supabase/`)
- Migración SQL inicial (`supabase/migrations/001_initial_schema.sql`)
- `.env.local.example` con placeholders (sin claves reales)

---

## 1. Crear proyecto Supabase (desde cero)

1. Entra a [https://supabase.com](https://supabase.com) → **New project**.
2. Elige organización, nombre (ej. `sistema-pollo`), contraseña de DB (guárdala), región cercana a LatAm si está disponible.
3. Espera a que el proyecto esté listo.
4. Ve a **Project Settings → API** y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (secreta; solo servidor)
5. **Authentication → Providers**: deja **Email** habilitado (password).
6. Abre **SQL Editor** → New query → pega el contenido de `supabase/migrations/001_initial_schema.sql` → **Run**.
7. Crea el primer usuario:
   - **Authentication → Users → Add user** (email + password), **o** regístrate desde la app cuando el login esté cableado.
   - En **Table Editor → profiles**, edita ese usuario y pon `role = superadmin`.

> Tip: el trigger `on_auth_user_created` crea el row en `profiles` automáticamente con rol `vendedora` por defecto.

---

## 2. Correr en local

```bash
cp .env.local.example .env.local
# Edita .env.local con las 3 keys de Supabase y NEXT_PUBLIC_APP_URL=http://localhost:3000

npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) (dashboard shell) o [/login](http://localhost:3000/login).

Sin keys reales la UI del shell funciona; las llamadas a Supabase fallarán hasta que configures `.env.local`.

---

## 3. Desplegar en Vercel (desde cero)

1. Sube este repo a GitHub (ya está en el remoto del proyecto).
2. Entra a [https://vercel.com](https://vercel.com) → **Add New Project** → importa el repositorio.
3. Framework preset: **Next.js** (autodetectado). Build Command / Output: defaults OK. **No hace falta `vercel.json`** para App Router.
4. En **Environment Variables** agrega (Production + Preview + Development según necesites):

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Secret** — no exponer al browser |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` | URL de producción |
| `NEXT_PUBLIC_BUSINESS_TZ` | `America/La_Paz` | opcional |

5. Deploy. Copia la URL de Vercel.
6. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: tu URL de Vercel
   - **Redirect URLs**: `https://tu-dominio.vercel.app/**` y `http://localhost:3000/**`

7. (Opcional) Dominio custom en Vercel → Domains; actualiza Site URL en Supabase.

### Redeploys

Cada push a la rama conectada redeploya. Si cambias env vars en Vercel, haz **Redeploy**.

---

## 4. Roles (recordatorio)

| Rol | Acceso |
|-----|--------|
| `vendedora` | Solo registrar pagos (QR/efectivo + monto) |
| `admin` | Visibilidad completa, CRUD, PDFs, dashboard |
| `superadmin` | Todo lo de admin + reset de contraseñas / usuarios |

RLS está esbozada en la migración; se endurecerá al cablear CRUD.

---

## 5. Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo local |
| `npm run build` | Build de producción (también lo usa Vercel) |
| `npm run start` | Servir build local |
| `npm run lint` | ESLint |

---

## 6. Estructura relevante

```
src/app/(app)/     → shell autenticado (dashboard + módulos)
src/app/login/     → login stub
src/lib/supabase/  → client / server / admin stubs
supabase/migrations/001_initial_schema.sql
.env.local.example
```

---

## Próximos pasos (producto)

1. Ervin: crear proyecto Supabase + pegar keys en `.env.local` y Vercel.
2. Cablear Auth real (login/logout + middleware de sesión).
3. Sprint 1 de datos: Proveedores → Compras (precio diferido) → Pagos.
4. Clientes / consignación + recibos con código.
5. Inventario + PDFs de cierre.
