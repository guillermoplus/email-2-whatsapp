# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monorepo informal (sin workspaces): `backend/` y `frontend/` son dos proyectos pnpm independientes, cada uno con su propio `package.json`, tsconfig y toolchain. Siempre ejecuta los comandos desde el subdirectorio correspondiente. Ambos fijan `packageManager` (pnpm 10.8.1) y Node 22.

**Ojo con pnpm 10:** ignora por defecto los scripts de instalación, así que cada proyecto declara en `pnpm.onlyBuiltDependencies` los paquetes que sí los necesitan (`sqlite3` y `puppeteer` en el backend; `esbuild`, `@tailwindcss/oxide` y `oxlint` en el frontend). Sin eso, el binding nativo de sqlite3 no se compila y la app no arranca.

El backend automatiza un flujo concreto: buscar en Outlook (Microsoft Graph) un correo con cierta palabra clave, renderizar su HTML a PNG con Puppeteer y enviarlo por WhatsApp a un número fijo, una vez al mes.

## Comandos

### Antes de ejecutar cualquier comando: verifica la versión de Node

Ningún `package.json` declara `engines` ni `packageManager`, y la versión de Node por defecto de la máquina puede ser demasiado antigua para pnpm (pnpm 10 exige Node >= 18.12). **Comprueba primero si hay `nvm` instalado y selecciona una versión adecuada**:

```sh
nvm list          # versiones disponibles (nvm4w en Windows)
nvm use 22        # o la LTS más reciente que esté instalada
node --version    # confirmar antes de seguir
```

Si `nvm use` no puede cambiar la versión global (falta de permisos en Windows), invoca el binario directamente:
`"$HOME/AppData/Local/nvm/v<version>/node.exe" <script>`.

Objetivo del proyecto: **Node 22 LTS** (Node 20 llegó a EOL en abril de 2026). El Dockerfile del backend aún usa `node:20-alpine` y `frontend/package.json` fija `volta.node: 20.16.0`; ver `PLAN-VULNERABILIDADES.md`.

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
pnpm dev                          # Vite en http://localhost:3000
pnpm test                         # vitest --run
pnpm test -- ProtectedRoute       # filtrar por nombre de archivo
pnpm test:watch
pnpm lint / pnpm lint:fix         # oxlint
pnpm typecheck                    # tsc -b --noEmit
pnpm validate                     # test + lint + typecheck + build en paralelo
```

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

SPA de **React 19 sobre Vite 8**, con **PrimeReact** para la UI y **Tailwind 4** para el layout. Reconstruida desde cero el 2026-09-12: antes era la plantilla `laststance/create-react-app-vite` con el código del proyecto encima, y arrastraba 94 avisos de dependencias, CI muerta y una licencia MIT ajena. Solo se migraron los ~240 renglones propios.

- Rutas en `src/router/router.tsx` (`createBrowserRouter`): `/` redirige a `/dashboard`, que va envuelto en `<Layout>` + `<ProtectedRoute>`; `/login` queda fuera del layout. **Todos los imports de router salen de `react-router`**, no de `react-router-dom`: en la v7 ese segundo paquete es solo un shim de compatibilidad.
- `src/router/AuthProvider.tsx` mantiene `isAuthenticated` y `permissions` en estado de React — **no hay persistencia ni llamadas al backend todavía**; `pages/Login` hace un login falso con `['admin:fullAccess']`. Aún no existe cliente HTTP hacia la API. El contexto y el hook `useAuth` viven aparte en `src/router/useAuth.ts` para que el provider exporte solo el componente (lo exige el fast refresh).
- `ProtectedRoute` acepta `requiredPermissions` y exige que estén todos presentes. Es lo único con tests (`src/router/ProtectedRoute.test.tsx`).
- Alias `@` → `src/`, declarado a la vez en `vite.config.ts` y `tsconfig.app.json`: **ambos deben mantenerse sincronizados**.
- **`src/index.css` importa solo las capas `theme` y `utilities` de Tailwind, omitiendo `preflight`**, porque su reset pisa los estilos del tema "styled" de PrimeReact. Si añades `@import "tailwindcss"` a secas, los botones e inputs se rompen.
- **`primereact` está fijado en 10.9.1**: la 11 eliminó `resources/themes/`, de donde sale el tema `tailwind-light` que importa `App.tsx`. Subir a la 11 obliga a migrar al sistema de design tokens.
- Tests con Vitest 5 + Testing Library, configurados dentro de `vite.config.ts` (usa el `defineConfig` de `vitest/config`, no el de `vite`). Lint con **oxlint**, no ESLint.

## Licencia

Todo el proyecto va bajo la AGPL v3 con restricción de uso comercial de la raíz (ver `backend/README.md`). El `LICENSE` MIT que tenía `frontend/` era de la plantilla y se eliminó en la reconstrucción.

## Estado de dependencias

`PLAN-VULNERABILIDADES.md` (raíz) lleva el plan por fases para las vulnerabilidades reportadas por Dependabot y su avance. Consúltalo y actualiza sus casillas antes de tocar dependencias.
