# Frontend — Email 2 WhatsApp

SPA de React 19 sobre Vite 8, con PrimeReact para la UI y Tailwind 4 para el layout.

## Requisitos

Node 22 (ver `volta.node`) y pnpm 10.8.1 (ver `packageManager`).

## Comandos

```sh
pnpm install
pnpm dev          # servidor de desarrollo en http://localhost:3000
pnpm build        # tsc -b + vite build -> dist/
pnpm preview      # sirve dist/
pnpm test         # vitest --run
pnpm test:watch
pnpm lint         # oxlint
pnpm lint:fix
pnpm typecheck    # tsc -b --noEmit
pnpm validate     # test + lint + typecheck + build en paralelo
```

## Notas

- Alias `@` → `src/`, declarado a la vez en `vite.config.ts` y `tsconfig.app.json`; ambos deben mantenerse sincronizados.
- `src/index.css` importa **solo** las capas `theme` y `utilities` de Tailwind, omitiendo `preflight`: su reset pisa los estilos del tema "styled" de PrimeReact.
- `primereact` está fijado en 10.9.1 porque la 11 eliminó `resources/themes/`, de donde sale el tema `tailwind-light` que usa `App.tsx`.
- La autenticación de `src/router/AuthProvider.tsx` es todavía un stub en memoria: no persiste ni habla con el backend.
