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
| 2026-09-11 | Tras Fase 2 | 2 / 41 / 18 / 7 = **68** (−15) | 4 / 48 / 34 / 8 = **94** | **162** |
| 2026-09-11 | Tras Fase 3 | 0 / 3 / 1 / 1 = **5** (−63) | 4 / 48 / 34 / 8 = **94** | **99** |
| 2026-09-11 | Tras Fase 4.1 | 0 / 2 / 0 / 0 = **2** (−3) | 4 / 48 / 34 / 8 = **94** | **96** |
| 2026-09-11 | Tras Fase 4.2 | 0 / 2 / 0 / 0 = **2** (sin cambio) | 4 / 48 / 34 / 8 = **94** | **96** |
| 2026-09-12 | Tras Fase 5 | 0 / 2 / 0 / 0 = **2** | 0 / 0 / 0 / 0 = **0** (−94) | **2** |

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

**Estado:** ✅ **completada 2026-09-11** · Sin efecto en el conteo de avisos (es infraestructura); desbloquea las Fases 4 y 5

Node 20 llegó a EOL en abril de 2026 y la máquina de desarrollo tenía Node 16 por defecto. Varios parches posteriores lo exigen: `react-router` 7.18 (≥20), `@testing-library/jest-dom` 6.10 (≥22).

- [x] `frontend/package.json`: `volta.node` → `22.23.2`
- [x] `backend/Dockerfile`: `FROM node:20-alpine` → `node:22-alpine`
- [x] Añadir `"packageManager": "pnpm@10.8.1"` a ambos `package.json`
- [x] `frontend`: el `validate` pasa a invocar `pnpm run` en vez de `npm run`
- [x] `backend/Dockerfile`: fijar `npm install -g pnpm@10.8.1` (antes sin versión: instalaba pnpm 12, que ignora los scripts de instalación), usar `pnpm install --frozen-lockfile` y mover el `apk add` antes del `COPY` para cachear capas
- [x] `backend/Dockerfile`: eliminar `RUN pnpm install --save-dev puppeteer` y `RUN pnpm install puppeteer-core`, que **reintroducían en la imagen las dependencias borradas en la Fase 1** y mutaban `package.json` dentro del build
- [x] `backend/Dockerfile`: `ENV PUPPETEER_SKIP_DOWNLOAD=true` — con `onlyBuiltDependencies` activo, Puppeteer descargaba ~180 MB de Chrome que la imagen no usa (su binario es glibc-only); el contenedor usa el Chromium de Alpine vía `PUPPETEER_EXECUTABLE_PATH`
- [x] `frontend/package.json`: `pnpm.onlyBuiltDependencies` para `@swc/core`, `esbuild` y `msw` — mismo problema que tenía el backend en la Fase 1
- [x] `backend/package.json`: override `prebuild-install: ^7.1.3` (ver abajo)

### El bloqueo que apareció: `prebuild-install@7.1.2`

La imagen con Node 22 **no compilaba**: `sqlite3` caía a `node-gyp` y Alpine no trae Python ni compilador.

La causa no era musl ni Node 22. Matriz probada en contenedores limpios — `node:20-alpine` y `node:22-alpine` × `sqlite3@5.1.7` y `@6.0.1`, con npm y con pnpm: **las cuatro combinaciones funcionan**. La diferencia estaba en nuestro lockfile, que pineaba `prebuild-install@7.1.2` (una resolución fresca trae 7.1.3). Esa versión no detecta la ABI y aborta con:

```
prebuild-install warn This package does not support N-API version undefined
prebuild-install warn install No prebuilt binaries found (target=undefined runtime=napi arch=x64 libc=musl platform=linux)
```

Se resuelve con un override en `backend/package.json`:

```json
"pnpm": { "overrides": { "prebuild-install": "^7.1.3" } }
```

**Conclusión para la Fase 3:** no hace falta subir `sqlite3` a 6.0.1 — 5.1.7 tiene prebuild napi válido para Alpine/musl en Node 20 y 22.

### Verificación

**Backend, en contenedor real** (`docker build` + `docker run`):

| Prueba | Resultado |
|---|---|
| `docker build` con `node:22-alpine` | Imagen construida |
| `require('sqlite3')` dentro del contenedor | OK — prebuild napi sobre musl, sin compilar |
| Puppeteer: `launch` + `setContent` + `screenshot` | OK — screenshot de 4198 bytes con Chrome/152 de Alpine. Es exactamente lo que hace el job de comprobantes |
| Arranque en modo producción con variables de entorno | `Server is running on port 3072` |
| `GET /api/auth/outlook/login` desde fuera del contenedor | 302 |

**Frontend** (Node 22): `pnpm typecheck` ✅, `pnpm build` ✅, `pnpm lint` ✅, `pnpm test` ❌ (ver abajo).

### Hallazgos

**`pnpm validate` nunca funcionó en Windows.** `scripts/validate` es un shell script invocado como `./scripts/validate`, que cmd.exe no sabe ejecutar (`'.' is not recognized as an internal or external command`). Como ningún workflow de CI lo usa (cada uno llama a `pnpm test` / `lint` / `typecheck` / `build` por separado), se inlineó el comando de `concurrently` en `package.json` y se borró el script. Ahora corre en Windows.

**3 tests del frontend fallan desde antes de tocar nada.** `src/App.test.tsx` sigue siendo el del template `create-react-app-vite`: busca `I'm REACT_APP_TEXT from .env` y `count is: 0`, que pertenecen a `src/pages/Index/` — la página que dejó de estar enrutada cuando se añadió el router. Ahora `App` monta `RouterProvider` y los tests revientan con `<Navigate> may be used only in the context of a <Router> component`.

> **Impacto en la Fase 5:** la suite está roja de base, así que `pnpm test` **no sirve como red de seguridad** para el bump de `react-router`. Hay que arreglar o borrar `App.test.tsx` antes, o verificar el bump a mano en el navegador.

**`husky` no se instala.** El `prepare` del frontend falla con `.git can't be found`: husky corre desde `frontend/` pero el repositorio git está un nivel más arriba. El hook de pre-commit (Prettier vía lint-staged) nunca se ha activado.

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

1. ~~**`GET /api/auth/outlook/login` devuelve HTTP 500.**~~ **✅ Corregido (2026-09-11)** antes de empezar la Fase 2, porque bloqueaba su verificación. `AuthController.login`, `callback` y `whatsappLogin` declaraban `(req: any, res: any)` sin los decoradores `@Req()` / `@Res()`, así que routing-controllers les pasaba `undefined` y reventaba en `res.redirect`. Roto desde la migración a routing-controllers (commit `f9478ed`).

   Solución: `login` recibe `@Res() res: Response` y **devuelve `res`** — `ExpressDriver.handleSuccess` solo omite enviar su propio cuerpo cuando la acción retorna la misma instancia de response, y `res.redirect()` de Express 4 devuelve `undefined` (devolver su resultado provocaba `ERR_HTTP_HEADERS_SENT` y mataba el proceso tras responder el 302). `callback` pasa a `@QueryParam('code')` y lanza `BadRequestError` / `InternalServerError` en vez de manipular `res`. `whatsappLogin` ya no declara parámetros.

   Verificado: `login` → 302 a Microsoft, `callback` sin code → 400, ruta inexistente → 404, y el servidor sigue vivo tras las tres peticiones sin errores en el log.
2. **`WhatsAppService` tumba el proceso al arrancar.** Su constructor llama a `initialize()` encadenando `.then()` sin `.catch()`; si Chromium no está disponible, la promesa rechazada sin manejar mata el servidor (Node ≥15). Localmente pasa por no tener navegador descargado; en Docker se salva porque `PUPPETEER_EXECUTABLE_PATH` apunta al Chromium de Alpine.

3. **`refresh-token.job` guarda respuestas de error como si fueran tokens.** `AuthService.refreshToken` devuelve el JSON de Microsoft sin mirar el código HTTP, y el job hace `tokenRepository.save(newToken)` y loguea "Token refreshed successfully!" aunque la respuesta sea un error. En la prueba de arranque quedó registrado un fallo `AADSTS7000222` seguido de ese log de éxito: se insertó una fila con `access_token` nulo que pasa a ser "el token más reciente" y rompe el job de envío.

Ninguno de los tres entra en el alcance de este plan, pero el primero invalida el paso de verificación de la Fase 2: hay que arreglar los decoradores antes de poder comprobar que el endpoint redirige.

**Aparte (operativo, no es código):**

- El secreto de cliente de Azure está **expirado** (`AADSTS7000222`), así que el flujo de Outlook no puede renovar tokens hasta que se genere uno nuevo en el portal.
- ~~**`AZURE_REDIRECT_URI` no coincide con la ruta real.**~~ **✅ Resuelto (2026-09-11).** El `.env` apuntaba a `/api/outlook/login/callback` mientras la ruta real era `/api/auth/outlook/login/callback`. Se optó por conservar la ruta (el prefijo `/auth` agrupa los dos flujos de autenticación) y alinear la configuración:
  - En Azure: registrado el redirect URI nuevo y **borrado el viejo**; secreto de cliente regenerado.
  - `src/config/routes.ts` (módulo nuevo, sin dependencias) define `API_PREFIX`, `AUTH_ROUTE`, `OUTLOOK_CALLBACK_ROUTE` y el derivado `OUTLOOK_CALLBACK_PATH`. `index.ts` (`routePrefix`), `AuthController` (`@JsonController` y `@Get`) y `environment.ts` consumen esas constantes, así que el path deja de estar duplicado.
  - `validateEnvironmentVariables()` falla al arranque si `AZURE_REDIRECT_URI` no termina en `OUTLOOK_CALLBACK_PATH`, con el valor recibido en el mensaje.
  - `.env.example` reescrito con las 17 variables reales (antes solo listaba dos, ninguna obligatoria) y `README.md` actualizado.

  Verificado: con el valor viejo el arranque aborta con `AZURE_REDIRECT_URI must end with /api/auth/outlook/login/callback, got ...`; con el corregido el servidor arranca y el `redirect_uri` que viaja a Microsoft es ya `/api/auth/outlook/login/callback`. **Falta la vuelta completa del OAuth** (requiere iniciar sesión en el navegador con la cuenta real).

---

## Fase 2 — Backend: lo realmente expuesto en red

**Estado:** ✅ **completada 2026-09-11** · **Impacto real: −15 avisos (83 → 68)** · Sin regresiones

| Cambio | Arregla | Compatibilidad verificada |
|---|---|---|
| `routing-controllers` 0.10.4 → **0.11.3** | koa 2.15.3 (crítica ReDoS + alta Host Header Injection), glob, brace-expansion | Sus optionalDeps pasan a `koa@^3` (fuera del rango vulnerable) y `glob@^11`. Peers siguen siendo `class-validator ^0.14.1` / `class-transformer ^0.5.1`. El código solo usa `@JsonController`, `@Get`, `createExpressServer`, `useContainer` e `IocAdapter`: API sin cambios |
| `express` 4.21.1 → **4.22.2** | path-to-regexp ReDoS (2 altas) | Sigue en 4.x; `~0.1.12` ya resuelve el parche 0.1.13. **No saltar a Express 5**: rompe routing-controllers 0.11, que declara `express ^4.21.2` |
| `class-validator` 0.14.1 → **0.14.4** | validator (alta) | Minor. **No subir a 0.15.1**: rompe el peer de routing-controllers |
| ~~`@azure/identity` 4.5.0 → 4.13.2~~ → **eliminado** | jws, verificación incorrecta de HMAC (2 altas) | **No se bumpeó: se borró.** Es peer *opcional* de `@microsoft/microsoft-graph-client`, y el código no lo usaba: `src/services/azure-identity.service.ts` nunca se importaba, y el constructor de `OutlookService` creaba un `ClientSecretCredential` en una variable local que descartaba. El token real llega por el callback `setGetToken()` desde el job |

- [x] Aplicar los bumps de routing-controllers, express y class-validator
- [x] Borrar `src/services/azure-identity.service.ts` y el `ClientSecretCredential` muerto de `OutlookService`; `pnpm remove @azure/identity`
- [x] Verificar: `pnpm build`, arranque del servidor y las pruebas de endpoint — `login` → 302, `callback` sin code → 400, `login` de nuevo → 302 (el servidor sigue vivo), ruta inexistente → 404, cero `ERR_HTTP_HEADERS_SENT`

**Confirmado en el árbol resultante:** `koa` 2.15.3 desaparece (entra `koa@3.2.1`, fuera del rango vulnerable), `path-to-regexp` pasa a 0.1.13 y `validator` a 13.15.35.

**Comprobación específica de la subida de routing-controllers:** el `res.redirect(...); return res;` de `AuthController.login` depende de que `ExpressDriver.handleSuccess` haga short-circuit al recibir la misma instancia de response. Sigue funcionando en 0.11.3 (302 correcto, sin `ERR_HTTP_HEADERS_SENT`).

**Críticas restantes (2), ambas fuera del alcance de esta fase:** `tar` vía `sqlite3` (Fase 3) y `basic-ftp` vía `puppeteer` (Fase 4.1).

---

## Fase 3 — Backend: cadenas transitivas con `overrides`

**Estado:** ✅ **completada 2026-09-11** · **Impacto real: −63 avisos (68 → 5)** · **Backend sin críticas ni altas propias** · Sin regresiones

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

Se descarta subir `sqlite3` a 6.0.1: **la Fase 0 confirmó en contenedores reales que 5.1.7 tiene prebuild napi válido para Alpine/musl en Node 20 y 22**, así que el mayor no aporta nada. El override de `prebuild-install` ya aplicado en la Fase 0 forma parte de este bloque.

- [x] Añadir el bloque `pnpm.overrides` (19 entradas, incluida la de `prebuild-install` que ya venía de la Fase 0)
- [x] Quitar `body-parser` y `@types/body-parser` como dependencias directas: tampoco se importaban. `routing-controllers` lo sigue trayendo como optionalDep, así que hizo falta además el override `body-parser@1` — pnpm reutilizaba la resolución vieja 1.20.3 del lockfile
- [x] `pnpm install && pnpm audit`: 68 → 5
- [x] Verificar que `sqlite3` sigue cargando y que el servidor responde
- [x] **Build limpio de Docker (`--no-cache`)**: `prebuild-install -r napi` resuelve sin caer a `node-gyp`, el contenedor arranca y responde 302/400

### Overrides aplicados

Selectores por rango-mayor para no imponerle a cada consumidor una API distinta de la que espera:

```json
"tar@<7.5.21": "^7.5.21",
"tar-fs@2": "^2.1.4",  "tar-fs@3": "^3.1.1",
"minimatch@3": "^3.1.4",  "minimatch@5": "^5.1.8",
"brace-expansion@1": "^1.1.18",  "brace-expansion@2": "^2.1.4",
"picomatch@2": "^2.3.2",  "js-yaml@4": "^4.3.2",
"ws@8": "^8.21.0",  "qs@6": "^6.16.0",
"basic-ftp": "^5.3.1",  "browserslist": "^4.28.7",
"diff@4": "^4.0.4",  "body-parser@1": "^1.20.6",
"@babel/core": "^7.29.6",  "@babel/helpers": "^7.26.10",  "@babel/runtime": "^7.26.10"
```

El de `tar` es el único que cruza un mayor (6 → 7): `sqlite3` lo declara como `^6.1.11` y solo lo usa en instalación. Por eso se verificó con un build de Docker sin caché, donde la instalación se ejecuta de cero.

### Dos overrides descartados a propósito

- **`ip-address` 9 → 10** (1 alta + 1 moderada): lo pide `socks@2.8.3`, que espera la API de la 9. Forzar el mayor es un riesgo mayor que el que cubre, y `socks` solo entra en juego con proxies SOCKS, que este proyecto no usa. Se resolverá al subir `puppeteer` en la Fase 4.1.
- **`extract-zip`** (2 altas): **no existe versión parcheada** (`patched: <0.0.0`). Solo desaparece cuando `puppeteer` deja de depender de él, es decir, en la Fase 4.1.

### Avisos restantes en el backend (5, ninguno crítico)

| Severidad | Módulo | Vía | Se resuelve en |
|---|---|---|---|
| alta ×2 | `extract-zip` | puppeteer | Fase 4.1 |
| alta + moderada | `ip-address` | puppeteer → socks | Fase 4.1 |
| baja | `@tootallnate/once` | sqlite3 → node-gyp | Sin impacto real (solo instalación) |

---

## Fase 4 — Backend: cambios con riesgo funcional (un commit por cada uno)

**Estado:** 4.1 ✅ completada 2026-09-11 (−3 avisos, 5 → 2) · 4.2 ✅ completada 2026-09-11 (prueba manual superada; 0 avisos, ver abajo)

### 4.1 `puppeteer` 23.6 → 25.10 ✅

**Corrección respecto a la planificación original:** este bump **no arregla `extract-zip` ni `ip-address`**. La atribución del `pnpm audit` señalaba «puppeteer» como origen, pero con las rutas completas se ve que ambos venían de otro sitio:

```
extract-zip  ->  .>whatsapp-web.js>puppeteer@18.2.1>puppeteer-core@18.2.1>extract-zip
ip-address   ->  .>sqlite3>node-gyp>make-fetch-happen>socks-proxy-agent>socks>ip-address
```

`basic-ftp`, `tar-fs` y `js-yaml` ya los había cerrado la Fase 3 con overrides. El bump se mantiene igualmente por higiene (la 23.x es antigua), pero su aporte al conteo es cero.

Lo que sí bajó el conteo fueron dos overrides añadidos al investigar el origen real:

- **`node-gyp: ^11.4.2`** — la 8.4.1 que declara `sqlite3` arrastraba `@tootallnate/once@1.1.2`, sin parche en su línea 1.x.
- **`socks: ^2.8.10`** — es la forma correcta de cerrar `ip-address`: la 2.8.10 ya depende de `ip-address@^10.1.1`, así que no hace falta forzarle a `socks` una API que no espera (era la razón por la que en la Fase 3 se descartó el override directo de `ip-address`).

- [x] Bump a `puppeteer@25.10.0` (exige **Node ≥22.12**, cubierto por la Fase 0)
- [x] Overrides `node-gyp` y `socks`
- [x] Verificar la conversión HTML→PNG del job dentro del contenedor

**Verificación:** se reprodujo `convertHtmlToImage()` tal cual — `launch` → `goto file://` → `evaluate` de dimensiones → `setViewport` → `screenshot({fullPage})`:

| Entorno | Resultado |
|---|---|
| Local (Windows, Node 22) | viewport 800×600, PNG de 7417 bytes, Chrome/152.0.7977.75 |
| Contenedor Alpine (Chromium del sistema) | viewport 800×600, PNG de 7841 bytes, Chrome/152.0.7977.82 |

Además: `pnpm build` ✅, build de Docker `--no-cache` ✅, servidor local 302/400/404/302 sin errores ✅.

### 4.2 `whatsapp-web.js` 1.26 → 1.34.7

El cambio más delicado. Arrastra su propio `puppeteer@24.38.0`; hoy arrastra el **18.2.1**, origen de 6 avisos. `Client`, `LocalAuth`, `MessageMedia` y `sendMessage` no cambian de firma, pero toca internals de WhatsApp Web. La versión actual tiene ~2 años y es probable que ya falle contra el WhatsApp Web vigente.

- [x] Bump a `whatsapp-web.js@1.34.7`. Su `puppeteer` anidado pasa de **18.2.1 → 24.38.0**
- [x] Re-escanear el QR
- [x] Enviar una imagen de prueba y confirmar recepción
- [x] Confirmar que la app real reutiliza la sesión sin pedir QR de nuevo

### Cómo se probó

Se movió la sesión de la 1.26 a un backup y se levantó un script temporal (`wa-qr.tmp.js`, ya borrado) que publicaba el QR en `http://localhost:3080` con auto-refresco, porque el endpoint `/api/auth/whatsapp/login` devuelve el QR como data-URL dentro de un JSON —ilegible para escanear— y además **destruye y reinicia el cliente en cada llamada**.

| Paso | Resultado |
|---|---|
| Arranque de wwebjs 1.34.7 y emisión de QR | OK |
| Escaneo desde el móvil | `AUTENTICADO` → `CLIENTE LISTO`, número `5732143xxxxx@c.us` |
| `sendMessage` con `MessageMedia.fromFilePath` al chat propio | Imagen entregada |
| Reinicio de la app real (`pnpm start:dev`) | `WhatsApp client authenticated!` → `ready and authenticated` **sin pedir QR**: la sesión de `LocalAuth` persiste |
| `GET /api/auth/whatsapp/login` con sesión activa | `{"message":"WhatsApp client is already authenticated."}` — no destruye la sesión |
| Endpoints de Outlook | 302 / 400 / 404 |

### Por qué el conteo no baja: `extract-zip`

Las 2 altas siguen ahí, pero cambiaron de origen:

```
antes:   .>whatsapp-web.js>puppeteer@18.2.1>puppeteer-core@18.2.1>extract-zip
después: .>whatsapp-web.js>puppeteer@24.38.0>@puppeteer/browsers@2.13.0>extract-zip
```

Nuestro `puppeteer@25.10.0` directo usa `@puppeteer/browsers@3.2.2`, que ya no depende de `extract-zip`. Forzar ese mayor dentro del puppeteer que `whatsapp-web.js` fija de forma exacta es peor negocio que el riesgo que cubre, y **la advisory no tiene versión parcheada** (`patched: <0.0.0`).

**Se acepta el riesgo**, porque no es alcanzable en esta configuración: `extract-zip` solo se ejecuta al descargar un navegador, y la imagen define `PUPPETEER_SKIP_DOWNLOAD=true` usando el Chromium de Alpine. Revisar cuando `whatsapp-web.js` suba a un puppeteer con `@puppeteer/browsers` 3.x.

### Observación al margen

En el arranque se vio al cron de comprobantes ejecutarse **antes** de que el cliente de WhatsApp terminase de autenticar, abortando con «WhatsApp client is not authenticated». Es una carrera preexistente: `WhatsAppService` tarda ~30 s en estar listo y los jobs arrancan de inmediato. Con el cron real (una vez al mes a una hora fija) no se manifiesta, pero conviene tenerlo presente.

> **Bug relacionado que interferirá con esta prueba:** `WhatsAppService.clearSession()` borra la ruta hardcodeada `/app/.wwebjs_auth/session` en **cada** `initialize()`. En Docker eso invalida la sesión persistida de `LocalAuth` y obliga a re-escanear el QR en cada reconexión. Es un defecto funcional, no de seguridad.

---

## Fase 5 — Frontend: reconstruido en vez de parcheado

**Estado:** ✅ **completada 2026-09-12** · **Impacto real: −94 avisos (94 → 0)**

El plan original era bumpear `react-router`, `vite`, `vitest`, `jsdom`, `concurrently`, `rimraf`, `postcss`, el stack de eslint y `@testing-library/jest-dom`. Antes de ejecutarlo se evaluó reconstruir, y los números decidieron.

### Por qué reconstruir

- **Código propio: ~240 de 901 líneas.** Login (77), AuthProvider (44), router (39), ProtectedRoute (33), más retoques en `App.tsx` y `main.tsx`. El resto era plantilla `laststance/create-react-app-vite`.
- **`pages/Dashboard/` era una copia byte a byte de `pages/Index/`**, la página demo del template: solo cambiaba el nombre del componente, y el `displayName` seguía diciendo `'Index'`.
- **Un scaffold nuevo con las mismas librerías da 0 avisos** — medido antes de decidir, no estimado.
- **No había CI.** `frontend/.github/workflows/` estaba inerte: GitHub solo lee `.github/` en la raíz del repositorio, y ahí no existe. Cinco workflows y los badges del README llevaban sin ejecutarse desde siempre.
- **`frontend/LICENSE` era MIT**, del autor del template, contradiciendo la AGPL v3 con restricción comercial de la raíz.
- Dependencias declaradas y nunca importadas: `react-transition-group`, `cross-fetch`, `all-contributors-cli`. Más `.all-contributorsrc`, un `FUNDING.yml` apuntando al autor del template y `scripts/remove_tailwind.js`.
- `husky` nunca se instalaba, `App.test.tsx` llevaba roto desde que se añadió el router, y las variables de entorno iban por el plumbing CRA (`REACT_APP_` vía `vite-plugin-environment`).

Parchear habría dejado todo eso intacto.

### Qué hay ahora

| | Antes | Ahora |
|---|---|---|
| Build | Vite 6.0.7 | **Vite 8.3.0** |
| Tests | Vitest 2.1.6, 3 rotos de 4 | **Vitest 5.0.0, 3 pasando de 3** |
| Lint | ESLint 9 + `eslint-config-ts-prefixer` | **oxlint** |
| CSS | Tailwind 3 + postcss + autoprefixer | **Tailwind 4** vía `@tailwindcss/vite` |
| TypeScript | 5.7.2 | **6.0.3** |
| Router | `react-router` + `react-router-dom` 7.1.1 | **`react-router` 7.18.3**, un solo paquete |
| Avisos | 94 | **0** |

`primereact` se mantiene **fijado en 10.9.1** a propósito: la 11 eliminó `resources/themes/`, de donde sale el tema `tailwind-light` que importa `App.tsx`. Migrar a su sistema de design tokens es una decisión aparte, no parte de esta fase.

### Las dos trampas de la migración

1. **Tailwind 4 sin preflight.** El `global.css` viejo tenía `@tailwind base;` comentado porque el reset de Tailwind pisa el tema "styled" de PrimeReact. El equivalente en la v4 es importar solo dos capas:

   ```css
   @layer theme, base, components, utilities;
   @import 'tailwindcss/theme.css' layer(theme);
   @import 'tailwindcss/utilities.css' layer(utilities);
   ```

2. **Los enlaces de `node_modules` de pnpm son absolutos en Windows**, así que renombrar `frontend-new/` a `frontend/` los invalidó (`Cannot find package 'yargs'`). Hay que reinstalar tras mover un proyecto de sitio.

### Verificación

Se condujo un navegador real con Puppeteer contra el servidor de desarrollo:

| Flujo | Resultado |
|---|---|
| `/` sin sesión | Redirige a `/login` |
| Pulsar «Iniciar Sesión» | Navega a `/dashboard` con `admin:fullAccess` |
| `/no-existe` | `404: Page Not Found` |
| `/dashboard` sin sesión | Redirige a `/login` |
| Errores de consola | **Ninguno** |

Y la prueba decisiva de fidelidad visual: **la captura del login de la versión vieja y la de la nueva son idénticas byte a byte** (mismo MD5). La migración de Vite 6 + Tailwind 3 a Vite 8 + Tailwind 4 no cambió un píxel.

`pnpm validate` (test + lint + typecheck + build) pasa entero, con **cero warnings** de lint. `App.test.tsx`, que probaba la demo del template, se sustituyó por `ProtectedRoute.test.tsx`, que prueba lógica real: redirección sin sesión, acceso tras iniciarla y bloqueo por permisos insuficientes.

---

## Fase 6 — Prevención

**Estado:** ⬜ pendiente

- [ ] Crear `.github/` **en la raíz del repositorio** con workflows que cubran `backend/` y `frontend/`: hoy el proyecto no tiene CI ninguna
- [ ] `.github/dependabot.yml` en la raíz apuntando a ambos directorios
- [ ] Añadir `pnpm audit --prod` al CI para separar lo que llega a producción del ruido de tooling
- [x] ~~Revisar restos de la plantilla `create-react-app-vite`~~ — resuelto al reconstruir el frontend en la Fase 5

## Correcciones de seguridad aplicadas (2026-09-13)

Dos fugas de credenciales detectadas al revisar el backend tras cerrar las fases.

### 1. La imagen Docker embebía secretos ✅

El `.dockerignore` solo excluía `node_modules`, `.env`, `.git` y `dist`, así que `COPY . .` metía dentro de la imagen:

| Ruta | Qué era |
|---|---|
| `/app/.wwebjs_auth/` | La sesión de WhatsApp: permite enviar mensajes como el usuario |
| `/app/src/database/database.db` | 10 filas en `tokens`, una con `access_token` de 1184 caracteres |
| `/app/tmp/email.png` | Un comprobante de pago renderizado |
| `/app/.idea/` | Configuración del IDE, incluidos los data sources |

Se reescribió el `.dockerignore`. Dos detalles que costaron una iteración:

- **Docker casa los patrones contra la ruta completa desde la raíz del contexto**, no como `.gitignore`: `*.db` no cubría `src/database/database.db`; hace falta `**/*.db`.
- `tmp/**/*` con `!tmp/.gitkeep`, porque el directorio **debe existir** en la imagen: el job escribe en `./tmp/email.html` con ruta relativa.

Verificado en la imagen reconstruida: `.wwebjs_auth`, `database.db`, `tmp/email.png`, `.idea` y `.env` ausentes; un `find` de `*.db`/`*.sqlite*`/`*.wwebjs*` fuera de `node_modules` no devuelve nada; `tmp/` sigue presente; el contenedor arranca, crea las tablas `tokens` y `messages` en runtime y responde 302/400.

> **Consecuencia operativa:** un contenedor recién desplegado ya no arranca con la base de datos de la máquina de desarrollo, así que **hay que hacer el login de Outlook y escanear el QR después de cada despliegue** hasta que se resuelva lo del volumen (ver pendientes). Antes esa "persistencia" era accidental y congelaba el estado del momento del build.

### 2. `AuthService` volcaba credenciales en los logs ✅

```
console.log('params:', params.toString())      // client_secret y el code de OAuth
console.log('getToken Response:', data)        // access_token y refresh_token completos
console.log('refreshToken Response:', data)
console.log('validateToken Response:', data)
```

Se eliminó el volcado de `params` y los tres volcados de respuesta pasan por `describeTokenResponse()`, que resume sin exponer nada: en error `HTTP <status> <error>: <error_description>`, en éxito `token_type`, `expires_in` y `scope`.

Verificado ejecutando `getToken()` y `refreshToken()` de verdad contra los endpoints de Microsoft con valores centinela: ni el secreto, ni el code, ni el refresh token aparecen en la salida.

---

## Pendientes conocidos, fuera del alcance de este plan

Defectos preexistentes detectados durante las verificaciones y documentados en su fase:

- **`WhatsAppService.clearSession()` borra la ruta hardcodeada `/app/.wwebjs_auth/session`** en cada `initialize()`. En Docker invalida la sesión persistida de `LocalAuth` y obliga a re-escanear el QR en cada reconexión.
- **`WhatsAppService` puede tumbar el proceso**: su constructor encadena `initialize().then()` sin `.catch()`.
- **`refresh-token.job` guarda respuestas de error como si fueran tokens**: `AuthService.refreshToken` no mira el código HTTP, así que un `AADSTS...` acaba insertado como «el token más reciente» con `access_token` nulo.
- **Carrera en el arranque**: los cron jobs se registran de inmediato, pero `WhatsAppService` tarda ~30 s en estar listo.
- **`extract-zip`**: las 2 altas que quedan en el backend. Sin versión parcheada y no alcanzables con `PUPPETEER_SKIP_DOWNLOAD=true`; ver Fase 4.2.
