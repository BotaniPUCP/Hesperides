/**
 * Capturas del video de venta (diseño 2026-11-17, sección 8). Solo navega y escribe en un
 * formulario que no se envía: no crea ni cambia datos. Usa los casos de demostración del perfil
 * dev (incidencia 2 con prellenado de IA, intervención 3 con evidencia).
 *
 * Variables opcionales:
 * - BASE: la web (por defecto http://localhost:3000).
 * - API_DIRECTA y ORIGEN_PERMITIDO: si la web corre en otro puerto que el backend no acepta por
 *   CORS, el navegador de capturas pide la API directo a API_DIRECTA con ese origen.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Locator, type Page } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const API_DIRECTA = process.env.API_DIRECTA;
const ORIGEN_PERMITIDO = process.env.ORIGEN_PERMITIDO ?? 'http://localhost:3000';
const SALIDA = 'public/capturas/venta';
const CLAVE_DEMO = 'Hesperides2026';

/** Escritorio igual que los videos anteriores: 1280×627 a 1,5 = 1920×941 en video. */
const ESCRITORIO = { viewport: { width: 1280, height: 627 }, escala: 1.5 };
/** Teléfono: 390×780 a 2 = 780×1560. */
const TELEFONO = { viewport: { width: 390, height: 780 }, escala: 2 };

type Medida = { x: number; y: number; ancho: number; alto: number };
const medidas: Record<string, Record<string, Medida>> = {};

async function entrar(navegador: Browser, correo: string, pantalla: typeof ESCRITORIO): Promise<Page> {
  const contexto = await navegador.newContext({
    viewport: pantalla.viewport,
    deviceScaleFactor: pantalla.escala,
    colorScheme: 'light',
    locale: 'es-PE',
  });
  if (API_DIRECTA) {
    await contexto.route('**/api/v1/**', async (ruta) => {
      const url = ruta.request().url().replace(new URL(BASE).origin, API_DIRECTA);
      const respuesta = await ruta.fetch({ url, headers: { ...ruta.request().headers(), origin: ORIGEN_PERMITIDO } });
      await ruta.fulfill({ response: respuesta });
    });
  }
  const page = await contexto.newPage();
  page.setDefaultTimeout(120000);
  page.on('dialog', (d) => void d.accept());
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill(correo);
  await page.locator('#password').fill(CLAVE_DEMO);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

async function capturar(page: Page, id: string, escala: number, elementos: Record<string, Locator> = {}) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForTimeout(1500);
  const propias: Record<string, Medida> = {};
  for (const [nombre, elemento] of Object.entries(elementos)) {
    const caja = await elemento.boundingBox({ timeout: 10000 }).catch(() => null);
    if (!caja) throw new Error(`No se ve «${nombre}» en la captura ${id}`);
    propias[nombre] = {
      x: Math.round(caja.x * escala),
      y: Math.round(caja.y * escala),
      ancho: Math.round(caja.width * escala),
      alto: Math.round(caja.height * escala),
    };
  }
  await page.screenshot({ path: `${SALIDA}/${id}.png` });
  medidas[id] = propias;
  console.log(`${id}: ${Object.keys(propias).join(', ') || 'sin medidas'}`);
}

/** La tarjeta blanca que contiene un título. */
const tarjetaDe = (page: Page, titulo: string) => page.getByText(titulo, { exact: true }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]');

(async () => {
  mkdirSync(SALIDA, { recursive: true });
  const navegador = await chromium.launch({ channel: 'chrome' });

  // v6: el capataz cuenta lo que pasó desde el celular (no se envía).
  const telefono = await entrar(navegador, 'capataz@demo.invalid', TELEFONO);
  await telefono.goto(`${BASE}/incidencias/nueva`);
  const texto = telefono.locator('textarea').first();
  await texto.fill('Rama caída en la puerta principal, tapa el paso.');
  await capturar(telefono, 'reporte-celular', TELEFONO.escala, { texto });

  // v6 y v7: coordinación ve el prellenado de IA y el tablero.
  const escritorio = await entrar(navegador, 'coordinador@demo.invalid', ESCRITORIO);
  await escritorio.goto(`${BASE}/incidencias/2`);
  await capturar(escritorio, 'incidencia-prellenada', ESCRITORIO.escala, {
    prellenado: tarjetaDe(escritorio, 'Prellenado por IA'),
    reporte: tarjetaDe(escritorio, 'Lo que se reportó'),
  });
  await escritorio.goto(`${BASE}/incidencias`);
  await capturar(escritorio, 'incidencias-tablero', ESCRITORIO.escala, {
    tarjeta: escritorio.getByText('INC-2026-0002', { exact: true }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]'),
  });

  // v9: una intervención ejecutada con su evidencia.
  await escritorio.goto(`${BASE}/intervenciones/3`);
  const verFoto = escritorio.getByRole('button', { name: 'Ver foto' }).first();
  await verFoto.scrollIntoViewIfNeeded();
  // Se ve la foto recibida y la ubicación validada, sin abrir la foto.
  await capturar(escritorio, 'intervencion-evidencia', ESCRITORIO.escala, {
    validada: escritorio.getByText(/Validada$/).filter({ visible: true }).first(),
    recibida: escritorio.getByText(/intento 1 · Recibida/).filter({ visible: true }).first(),
  });

  // v10: el mapa del campus con colores por zonas.
  await escritorio.goto(`${BASE}/mapa`);
  await escritorio.waitForTimeout(4000);
  await capturar(escritorio, 'mapa-zonas', ESCRITORIO.escala);

  await navegador.close();
  writeFileSync(`${SALIDA}/medidas.json`, JSON.stringify(medidas, null, 2));
  const rama = process.env.RAMA ?? 'feature/spec-112-colores-por-zonas';
  const commit = process.env.COMMIT ?? execSync(`git rev-parse ${rama}`).toString().trim();
  writeFileSync(`${SALIDA}/origen.json`, JSON.stringify({ rama, commit, fecha: new Date().toISOString(), v9: 'intervencion-evidencia' }, null, 2));
})();
