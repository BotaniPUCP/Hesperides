/*
 * Service worker mínimo de SPEC-120: hace instalable la app y no guarda nada
 * en caché. Solo interviene cuando una navegación falla por falta de red, para
 * mostrar un aviso en español en lugar de la página de error de Chrome.
 */

const OFFLINE_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hesperides · Sin conexión</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#02591F;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}
button{margin-top:16px;padding:10px 20px;border:0;border-radius:8px;font-size:16px;
background:#fff;color:#02591F}
</style></head>
<body><main><h1>Sin conexión</h1>
<p>Hesperides necesita internet. Revisa tu señal e inténtalo de nuevo.</p>
<button onclick="location.reload()">Reintentar</button></main></body></html>`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});
