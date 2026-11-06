<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Estilos

- Tailwind CSS 4 usa `@tailwindcss/postcss`, sin `autoprefixer`.
- `src/styles/globals.css` carga `tailwind.config.ts` con `@config`; conservarlo
  para los tokens semánticos y el modo oscuro por clase. `forest` mantiene la
  paleta fija de SPEC-C01; no sustituirla por la paleta predeterminada de v4.
- Para el aspecto anterior a v4, usar `shadow-xs`, `rounded-xs` y
  `outline-hidden` en lugar de `shadow-sm`, `rounded-sm` y `outline-none`.
- `src/styles/__tests__/tailwind.test.ts` verifica la compilación CSS real;
  comprobar además claro/oscuro y responsive en un navegador.
