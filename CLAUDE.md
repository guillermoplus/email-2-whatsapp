# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monorepo informal (sin workspaces): `backend/` y `frontend/` son dos proyectos pnpm independientes, cada uno con su propio `package.json`, `.env`, tsconfig y toolchain. Siempre ejecuta los comandos desde el subdirectorio correspondiente.

El backend automatiza un flujo concreto: buscar en Outlook (Microsoft Graph) un correo con cierta palabra clave, renderizar su HTML a PNG con Puppeteer y enviarlo por WhatsApp a un número fijo, una vez al mes.

## Comandos

### Backend (`cd backend`)
```sh
pnpm install
pnpm start:dev     # ts-node src/index.ts (desarrollo)
pnpm build         # tsc -> dist/
pnpm start         # node dist/index.js (requiere build previo)
```
No hay tests (`pnpm test` falla a propósito) ni linter; solo Prettier (`.prettierrc`). Docker: `docker build -t email2wa backend/` — la imagen instala Chromium de Alpine y fija `PUPPETEER_EXECUTABLE_PATH`.

### Frontend (`cd frontend`)
```sh
pnpm install
pnpm dev                       # Vite en http://localhost:3000
pnpm test                      # vitest --run
pnpm test -- src/App.test.tsx  # un solo archivo
pnpm test:watch                # modo watch
pnpm lint / pnpm lint:fix      # eslint -c eslint.config.mjs
pnpm typecheck                 # tsc --noEmit
pnpm validate                  # test + lint:fix + typecheck + build en paralelo
```
`husky` + `lint-staged` corren Prettier en pre-commit.

## Arquitectura del backend

Flujo de arranque en `src/index.ts`: `preloadConfiguration()` abre SQLite → `initServer()` valida el entorno, registra el contenedor DI, monta Express y arranca los cron jobs.

- **DI con Awilix (`InjectionMode.PROXY`, `strict: true`)**: el contenedor se exporta como `dependencyContainer` desde `src/index.ts`. Por ser modo PROXY, **los constructores reciben un único objeto `opts` y desestructuran de ahí** (`constructor(opts) { this._x = opts.xService }`), no parámetros posicionales. Registrar toda clase nueva en `initServer()` o la resolución falla (modo estricto).
- **routing-controllers + AwilixAdapter**: `src/adapters/awilix.adapter.ts` traduce el nombre de la clase a la clave camelCase del contenedor (`AuthController` → `authController`). Los controllers van en el array `controllers:` de `createExpressServer` y todas las rutas cuelgan de `routePrefix: '/api'`.
- **Los jobs resuelven dependencias en tiempo de ejecución**, no por constructor: importan `dependencyContainer` desde `../index` y llaman `.resolve<T>('nombre')` dentro de `onTick`. Esto crea un ciclo de imports deliberado; mantener ese patrón evita romperlo.
- **SQLite sin ORM**: `src/database/data-source.ts` abre `./src/database/database.db` (ruta relativa al CWD, así que hay que ejecutar desde `backend/`) y crea las tablas con `CREATE TABLE IF NOT EXISTS` en cada arranque — no hay migraciones; cambiar un esquema implica editar ese `ensureTablesCreation` y migrar a mano. Los repositorios escriben SQL crudo parametrizado; las "entities" son solo interfaces TypeScript.
- **Entorno**: `src/config/environment.ts` es la única fuente de configuración. Carga `.env` solo si `NODE_ENV === 'development'`, valida las variables obligatorias lanzando error, y cachea vía `ENV_VARIABLES_LOADED`. Las variables requeridas son las de `azure.*`, `outlook.*`, `whatsapp.searchKeyword`, `whatsapp.destinationPhoneNumber` y ambos `cronTime.*`. Nota: `backend/.env.example` está desactualizado; la lista real está en ese archivo y en `backend/README.md`. Varios servicios leen `process.env` directo en vez de usar este módulo.

### Autenticación (dos flujos independientes, ambos manuales la primera vez)

1. **Outlook / Microsoft Graph** — OAuth2 authorization-code contra Azure AD. `GET /api/auth/outlook/login` redirige al consentimiento; `/api/auth/outlook/login/callback` intercambia el code y guarda el token en la tabla `tokens`. `refresh-token.job` (cron `CRON_REFRESH_OUTLOOK_TOKEN`) renueva el último token cuando le quedan menos de 5 minutos. `OutlookService` obtiene el access token por callback inyectado (`setGetToken`), no por credencial de app.
2. **WhatsApp** — `whatsapp-web.js` con `LocalAuth` sobre Chromium/Puppeteer. `WhatsAppService` es singleton y se inicializa en su propio constructor; `GET /api/auth/whatsapp/login` devuelve el QR como data-URL para escanear. Ojo: `initialize()` llama a `clearSession()`, que **borra la sesión persistida** en la ruta hardcodeada `/app/.wwebjs_auth/session` (path del contenedor Docker; en local no coincide con `backend/.wwebjs_auth`).

### Job principal (`send-admin-payment-receipt.job.ts`)

Cron en zona `America/Bogota`. Idempotencia por mes: consulta `messages` y no reenvía si ya existe un envío a ese número este mes. Busca correos del 1 al 10 del mes con `SEARCH_KEYWORD`, escribe el HTML en `backend/tmp/email.html`, lo captura como `tmp/email.png` con Puppeteer (rutas relativas al CWD) y lo envía con caption en español; registra el resultado en `messages`.

## Arquitectura del frontend

Partiendo de la plantilla `laststance/create-react-app-vite` (su `README.md`, LICENSE y workflows de GitHub son de la plantilla, no del proyecto). React 19 + Vite + TypeScript, PrimeReact como librería de UI y TailwindCSS para layout.

- Rutas en `src/router/router.tsx` (`createBrowserRouter`): `/` redirige a `/dashboard`, que va envuelto en `<Layout>` + `<ProtectedRoute>`; `/login` queda fuera del layout.
- `src/router/AuthProvider.tsx` mantiene `isAuthenticated` y `permissions` solo en estado de React — **no hay persistencia ni llamadas al backend todavía**; `pages/Login` hace un login falso con `['admin:fullAccess']` (marcado `// TODO: Testing purposes`). Aún no existe cliente HTTP hacia la API del backend.
- `ProtectedRoute` acepta `requiredPermissions` y exige que estén todos presentes.
- Alias `@` → `src/` (definido en `vite.config.ts`, `vitest.config.ts` y `tsconfig.json`: los tres deben mantenerse sincronizados).
- Variables de entorno estilo CRA: solo las prefijadas `REACT_APP_` y declaradas en `EnvironmentPlugin([...])` de `vite.config.ts` llegan al bundle.
- MSW se arranca en `src/main.tsx` únicamente en desarrollo (handlers en `mocks/handlers.ts`); en producción la app monta sin mocks.
- Tests con Vitest + Testing Library (globals activados, `src/setupTests.ts`), colocados junto al código (`*.test.ts(x)` bajo `src/`).
- `src/pages/Index/` es la página de ejemplo de la plantilla y está duplicada en `src/pages/Dashboard/`; `Index` ya no está enrutada.

## Licencia

Backend AGPL v3 con restricción de uso comercial (ver `backend/README.md`); el `LICENSE` MIT de `frontend/` proviene de la plantilla.
