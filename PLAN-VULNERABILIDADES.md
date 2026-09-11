# Plan de remediación de dependencias

Estado del trabajo sobre las vulnerabilidades reportadas por Dependabot en `guillermoplus/email-2-whatsapp`.
Marca las casillas a medida que avances y actualiza el estado de cada fase.

- **Auditoría base:** 2026-09-11
- **Total reportado por GitHub:** 226 alertas (9 críticas, 128 altas, 69 moderadas, 20 bajas)
- **Reproducido localmente con `pnpm audit`:** 221 → backend 127 (4C / 68A / 43M / 12B), frontend 94 (4C / 48A / 34M / 8B). La diferencia es de conteo por manifiesto.

## Regla de trabajo

**Al cerrar cada fase hay que volver a correr `pnpm audit` en el proyecto afectado y registrar el resultado en la tabla de abajo**, junto al estado de la fase. Sin esa medición la fase no se considera terminada.

### Historial de mediciones

| Fecha | Momento | Backend (C/A/M/B) | Frontend (C/A/M/B) | Total |
|---|---|---|---|---|
| 2026-09-11 | Línea base | 4 / 68 / 43 / 12 = **127** | 4 / 48 / 34 / 8 = **94** | **221** |
| 2026-09-11 | Tras Fase 1 | 3 / 51 / 19 / 10 = **83** (−44) | 4 / 48 / 34 / 8 = **94** | **177** |

## Cómo reproducir la auditoría

```sh
nvm use 22            # pnpm 10 no corre con Node 16 (ver CLAUDE.md)
cd backend && pnpm audit
cd ../frontend && pnpm audit
```

## Criterio de priorización

La severidad de Dependabot ignora el contexto de uso. Orden real de exposición:

| Riesgo real | Qué | Por qué |
|---|---|---|
| Alto | `routing-controllers` → koa 2.15.3, `express` → path-to-regexp | Código de servidor expuesto en el puerto 3072 |
| Medio | `react-router` | Única dependencia del frontend que llega al navegador |
| Bajo | `sqlite3` → tar, `puppeteer` → basic-ftp / tar-fs | Solo se ejecutan durante `pnpm install` / descarga de Chromium |
| Mínimo | vitest, vite, eslint, tailwind, rimraf, concurrently | devDependencies; requieren repo o web maliciosa con el dev server activo |

---

## Fase 0 — Estandarizar Node y el gestor de paquetes

**Estado:** ⬜ pendiente

Node 20 llegó a EOL en abril de 2026 y la máquina de desarrollo tiene Node 16 por defecto. Varios parches posteriores lo exigen: `react-router` 7.18 (≥20), `sqlite3` 6 (≥20.17), `@testing-library/jest-dom` 6.10 (≥22).

- [ ] `frontend/package.json`: `volta.node` → `22.x`
- [ ] `backend/Dockerfile`: `FROM node:20-alpine` → `node:22-alpine`
- [ ] Añadir `"packageManager": "pnpm@10.8.1"` a ambos `package.json` (hoy nada fija el gestor)
- [ ] Corregir `frontend/scripts/validate`: invoca `npm run` en vez de `pnpm run`

---

## Fase 1 — Backend: eliminar dependencias muertas

**Estado:** ✅ **completada 2026-09-11** · **Impacto real: −44 avisos (127 → 83)** · Sin regresiones

Verificado con grep sobre `backend/src`: no se importan en ningún archivo.

| Dependencia | Avisos | Comprobación |
|---|---|---|
| `axios` | 33 (1C / 14A) | Sin importar; ningún otro paquete del árbol depende de él |
| `imapflow` + `@types/imapflow` | 11 | Solo desde `src/services/email.service.ts`, que nunca se importa (código muerto) |
| `puppeteer-core` | — | Sin importar; el job usa `puppeteer` (devDep) |
| `multer`, `qrcode-terminal`, `@microsoft/microsoft-graph-types` | — | Sin importar |

No tocar: `class-validator` y `class-transformer` no se usan en código pero son **peerDependencies obligatorias** de routing-controllers.
Sin ganancia: quitar `body-parser` como dependencia directa no lo saca del árbol (es optionalDep de routing-controllers).

- [x] `cd backend && pnpm remove axios imapflow @types/imapflow puppeteer-core multer qrcode-terminal @microsoft/microsoft-graph-types`
- [x] Quitar también `@types/multer` y `@types/qrcode-terminal`, que quedaron huérfanos (sin efecto en el conteo de avisos)
- [x] Borrar `backend/src/services/email.service.ts`
- [x] Mover `puppeteer` de `devDependencies` a `dependencies` — **bug latente**: `send-admin-payment-receipt.job.ts` lo importa en runtime, así que `pnpm install --prod` rompería el job. Hoy solo funciona porque el Dockerfile instala todo
- [x] Verificar: `pnpm build` compila sin errores; `pnpm start:dev` llega a "Server is running on port 3072" y crea las tablas `tokens` y `messages`

### Hallazgos durante la ejecución

**Cambio adicional necesario — `pnpm.onlyBuiltDependencies`.** pnpm 10 ignora por defecto los scripts de instalación de las dependencias, así que `sqlite3` nunca compilaba su binding nativo y la app no arrancaba (`Could not find module ... node_sqlite3.node`). Se añadió a `backend/package.json`:

```json
"pnpm": { "onlyBuiltDependencies": ["sqlite3", "puppeteer"] }
```

> **Riesgo de despliegue asociado (pendiente, mover a Fase 0):** el `Dockerfile` hace `npm install -g pnpm` sin fijar versión, así que hoy instala pnpm 12 y sufre exactamente el mismo problema. Sin este `onlyBuiltDependencies` la imagen se construye pero **falla en runtime**. Falta verificar que en Alpine/musl exista prebuild napi para `sqlite3`; si no, habrá que añadir `build-base`, `python3` y `make` a la imagen.

**Notas de entorno (no son defectos del repo):**
- `sqlite3` 5.1.7 instala un prebuild **napi** (ABI-independiente): el mismo `.node` carga en Node 20, 22 y 24. Un intento de `pnpm rebuild` bajo Node 22 falló al descargar el prebuild y cayó a `node-gyp` (sin MSVC en la máquina); bajo Node 20 funcionó. A vigilar al ejecutar la Fase 0.
- La máquina no tenía Node 20 ni 22 en `nvm`; se instalaron ambos (`nvm install 20`, `nvm install 22`).

**Dos defectos preexistentes detectados al verificar, ajenos a las dependencias:**

1. **`GET /api/auth/outlook/login` devuelve HTTP 500.** `AuthController.login`, `callback` y `whatsappLogin` declaran `(req: any, res: any)` sin los decoradores `@Req()` / `@Res()`, así que routing-controllers les pasa `undefined` y revienta en `res.redirect` (`TypeError: Cannot read properties of undefined (reading 'redirect')`). Roto desde la migración a routing-controllers (commit `f9478ed`); el código comentado en `src/index.ts` muestra que antes se montaban a mano sobre Express, donde sí funcionaban. **El flujo OAuth de Outlook está caído hoy.**
2. **`WhatsAppService` tumba el proceso al arrancar.** Su constructor llama a `initialize()` encadenando `.then()` sin `.catch()`; si Chromium no está disponible, la promesa rechazada sin manejar mata el servidor (Node ≥15). Localmente pasa por no tener navegador descargado; en Docker se salva porque `PUPPETEER_EXECUTABLE_PATH` apunta al Chromium de Alpine.

3. **`refresh-token.job` guarda respuestas de error como si fueran tokens.** `AuthService.refreshToken` devuelve el JSON de Microsoft sin mirar el código HTTP, y el job hace `tokenRepository.save(newToken)` y loguea "Token refreshed successfully!" aunque la respuesta sea un error. En la prueba de arranque quedó registrado un fallo `AADSTS7000222` seguido de ese log de éxito: se insertó una fila con `access_token` nulo que pasa a ser "el token más reciente" y rompe el job de envío.

Ninguno de los tres entra en el alcance de este plan, pero el primero invalida el paso de verificación de la Fase 2: hay que arreglar los decoradores antes de poder comprobar que el endpoint redirige.

**Aparte (operativo, no es código):** el secreto de cliente de Azure está **expirado** (`AADSTS7000222`), así que el flujo de Outlook no puede renovar tokens hasta que se genere uno nuevo en el portal.

---

## Fase 2 — Backend: lo realmente expuesto en red

**Estado:** ⬜ pendiente · **Riesgo funcional:** bajo

| Cambio | Arregla | Compatibilidad verificada |
|---|---|---|
| `routing-controllers` 0.10.4 → **0.11.3** | koa 2.15.3 (crítica ReDoS + alta Host Header Injection), glob, brace-expansion | Sus optionalDeps pasan a `koa@^3` (fuera del rango vulnerable) y `glob@^11`. Peers siguen siendo `class-validator ^0.14.1` / `class-transformer ^0.5.1`. El código solo usa `@JsonController`, `@Get`, `createExpressServer`, `useContainer` e `IocAdapter`: API sin cambios |
| `express` 4.21.1 → **4.22.2** | path-to-regexp ReDoS (2 altas) | Sigue en 4.x; `~0.1.12` ya resuelve el parche 0.1.13. **No saltar a Express 5**: rompe routing-controllers 0.11, que declara `express ^4.21.2` |
| `class-validator` 0.14.1 → **0.14.4** | validator (alta) | Minor. **No subir a 0.15.1**: rompe el peer de routing-controllers |
| `@azure/identity` 4.5.0 → **4.13.2** | jws, verificación incorrecta de HMAC (2 altas) | Minor; solo se usa `ClientSecretCredential` |

- [ ] Aplicar los cuatro bumps
- [ ] Verificar: `pnpm build` y arranque del servidor. `GET /api/auth/outlook/login` **no sirve como prueba mientras no se arreglen los decoradores `@Req()`/`@Res()`** (ver hallazgos de la Fase 1); comprobar en su lugar que las rutas quedan registradas y que el servidor responde

---

## Fase 3 — Backend: cadenas transitivas con `overrides`

**Estado:** ⬜ pendiente · **Riesgo funcional:** bajo

`tar`, `minimatch`, `brace-expansion`, `basic-ftp`, `ws`, `js-yaml`, `picomatch` e `ip-address` vienen del toolchain de `sqlite3` (node-gyp) y `puppeteer`: solo se ejecutan en instalación. En vez de mayores arriesgados, fijarlos por rango-mayor en `backend/package.json` (el selector por major evita romper paquetes que esperan la API v3):

```json
"pnpm": {
  "overrides": {
    "tar@7": "^7.5.21",
    "minimatch@3": "^3.1.4", "minimatch@5": "^5.1.8", "minimatch@9": "^9.0.7",
    "brace-expansion@1": "^1.1.18", "brace-expansion@2": "^2.1.4",
    "picomatch@2": "^2.3.2",
    "js-yaml@4": "^4.3.2",
    "basic-ftp": "^5.3.1",
    "ws@8": "^8.21.0",
    "ip-address": "^10.3.1"
  }
}
```

Se descarta subir `sqlite3` a 6.0.1: exige Node ≥20.17 y cambia a `prebuild-install`, que **podría no tener binarios para Alpine/musl** y forzaría compilación dentro del contenedor.

- [ ] Añadir el bloque `pnpm.overrides`
- [ ] `pnpm install && pnpm audit` para confirmar la reducción
- [ ] Verificar que `sqlite3` sigue cargando: arrancar y comprobar que se crean las tablas

---

## Fase 4 — Backend: cambios con riesgo funcional (un commit por cada uno)

**Estado:** ⬜ pendiente · **Riesgo funcional:** alto — requiere prueba manual

### 4.1 `puppeteer` 23.6 → 25.10

Arregla basic-ftp, tar-fs, js-yaml, ip-address y las dos advisories de `extract-zip` que **no tienen parche disponible** (solo se resuelven porque puppeteer moderno ya no lo usa). La API usada (`launch`, `goto`, `evaluate`, `setViewport`, `screenshot`) es estable.

- [ ] Bump
- [ ] Verificar la conversión HTML→PNG del job dentro del contenedor (Chromium de Alpine)

### 4.2 `whatsapp-web.js` 1.26 → 1.34.7

El cambio más delicado. Arrastra su propio `puppeteer@24.38.0`; hoy arrastra el **18.2.1**, origen de 6 avisos. `Client`, `LocalAuth`, `MessageMedia` y `sendMessage` no cambian de firma, pero toca internals de WhatsApp Web. La versión actual tiene ~2 años y es probable que ya falle contra el WhatsApp Web vigente.

- [ ] Bump
- [ ] Re-escanear el QR en `GET /api/auth/whatsapp/login`
- [ ] Enviar una imagen de prueba y confirmar recepción

> **Bug relacionado que interferirá con esta prueba:** `WhatsAppService.clearSession()` borra la ruta hardcodeada `/app/.wwebjs_auth/session` en **cada** `initialize()`. En Docker eso invalida la sesión persistida de `LocalAuth` y obliga a re-escanear el QR en cada reconexión. Es un defecto funcional, no de seguridad.

---

## Fase 5 — Frontend

**Estado:** ⬜ pendiente

### 5.1 Lo único que llega al navegador

| Cambio | Arregla | Compatibilidad |
|---|---|---|
| `react-router` + `react-router-dom` 7.1.1 → **7.18.3** | 9 altas (RCE de turbo-stream, XSS por open redirect, 2 DoS) | Minor dentro de 7.x; peer `react >=18` (hay 19). Se usan `createBrowserRouter`, `RouterProvider`, `Navigate`, `useNavigate`: sin cambios. Mantener **ambos paquetes en la misma versión** y desanclar el `7.1.1` fijo de `react-router-dom`. No pasar a v8 |

- [ ] Bump de ambos paquetes
- [ ] Verificar: `/` redirige a `/dashboard`, `/dashboard` sin sesión redirige a `/login`, y el login de prueba entra al dashboard

### 5.2 Tooling de desarrollo (agrupable en un commit)

| Cambio | Arregla | Nota |
|---|---|---|
| `vite` 6.0.7 → **6.4.3** | 3 altas (lectura arbitraria vía WebSocket del dev server, bypass de `server.fs.deny`) + rollup ≥4.59 + postcss | Patch dentro de 6.x. **No saltar a Vite 8** |
| `vitest` + `@vitest/ui` 2.1.6 → **3.2.7** | 2 críticas (RCE del API server, lectura de archivos del UI server) | v3 soporta `vite ^6`. El `vitest.config.ts` actual es válido en v3. Alternativa de mínimo riesgo: **2.1.9** cierra la crítica de RCE; la segunda solo aplica si se usa `pnpm test:ui` |
| `jsdom` 25 → **26.1.0** | form-data (crítica), ws, tough-cookie | Solo entorno de tests |
| `concurrently` → **9.2.4** | shell-quote (crítica) | Trae `shell-quote@1.9.0` exacto |
| `rimraf` → **6.1.3**, `postcss` → **8.5.28**, stack de eslint | glob, minimatch, postcss | Rutinario |
| `@testing-library/jest-dom` → **6.10.0** | lodash (alta) | Elimina lodash del árbol, pero **exige Node ≥22** (depende de la Fase 0) |

- [ ] Aplicar bumps
- [ ] Verificar: `pnpm validate` (test + lint + typecheck + build)

---

## Fase 6 — Prevención

**Estado:** ⬜ pendiente

- [ ] Configurar `.github/dependabot.yml` en la raíz para que cubra `backend/` y `frontend/` (el actual vive en `frontend/.github/` y viene de la plantilla)
- [ ] Añadir `pnpm audit --prod` al CI para separar lo que llega a producción del ruido de tooling
- [ ] Revisar restos de la plantilla `create-react-app-vite` sin usar (`all-contributors-cli`, `cross-fetch`, `ts-expect`, `src/pages/Index/` duplicado)
