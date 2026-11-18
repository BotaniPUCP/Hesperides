'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_URL = '/sw.js';

/**
 * Registra el service worker que hace instalable la app (SPEC-120). No pinta
 * nada. Si falla, la app sigue funcionando en el navegador; el aviso en
 * consola es la única pista de por qué el celular no ofrece instalarla
 * (lo normal: el sitio no está en HTTPS).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: '/' })
      .catch((error: unknown) => console.warn('No se pudo registrar el service worker', error));
  }, []);

  return null;
}
