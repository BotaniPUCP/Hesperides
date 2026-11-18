# SPEC-120 — Aplicación instalable en el celular (PWA)

| Campo | Valor |
|-------|-------|
| HU relacionada | — (pedido directo del 18 nov 2026; impedimento I-2 del sprint backlog) |
| Autor | Jean Piero David Morán |
| Plataforma | Web (Android e iOS desde el navegador) |
| Sprint | — |
| Dependencias | Ninguna |

> **Lectura obligatoria:** `specs/REGLAS.md`.

---

## 1. Objetivo

Que Chrome en Android ofrezca «Instalar aplicación» y deje un ícono de Hesperides en el
celular que abra el sistema a pantalla completa, sin la barra del navegador.

## 2. Alcance

- Sí: manifiesto, íconos, color de barra y service worker mínimo.
- No: trabajo sin conexión, sincronización ni caché de datos o del visor 3D. Eso queda para
  una spec posterior (captura offline de B-02 y C-01).
- No: publicar en Play Store (sería una TWA encima de esta PWA).

## 3. Decisiones

| # | Decisión |
|---|---|
| D-01 | El ícono es `docs/marca/iconos/hesperides-icono-app.svg`. Las otras tres variantes quedan guardadas como marca. |
| D-02 | El mismo ícono se usa como `any` y como `maskable`. En Android con recorte circular la hoja de la esquina se corta; aceptado el 18 nov. |
| D-03 | Nombre «Hesperides», abre en `/`, `display: standalone`, color #02591F (verde de marca) en barra y pantalla de arranque. |
| D-04 | Sin librerías nuevas (`next-pwa` / Serwist solo aportan para offline). Se usa `app/manifest.ts` de Next. |
| D-05 | El service worker no guarda nada en caché. Solo atiende navegaciones: si la red falla, responde una página corta «Sin conexión» en vez del dinosaurio de Chrome. |
| D-06 | Los PNG se generan con `scripts/build-app-icons.mjs` (sharp, que ya trae Next) y se commitean. |

## 4. Implementación

| Pieza | Archivo |
|---|---|
| Manifiesto | `frontend/src/app/manifest.ts` |
| Íconos del manifiesto (192, 512) | `frontend/public/icons/` |
| Favicon e ícono de iPhone | `frontend/src/app/icon.png`, `frontend/src/app/apple-icon.png` |
| Service worker | `frontend/public/sw.js` |
| Registro del service worker | `frontend/src/components/pwa/ServiceWorkerRegistration.tsx` |
| Color de barra y título en iOS | `frontend/src/app/layout.tsx` (`viewport`, `metadata`) |

## 5. Requisito de despliegue

Chrome solo ofrece instalar en HTTPS (o `localhost`). En producción lo da el proxy TLS de
`docs/arquitectura/despliegue.md`.
