/**
 * Mapa del campus al atardecer (rama feature/spec-112-atardecer, aún sin mergear) para el video
 * de la historia: la vista con la app y la maqueta sola en «Modo captura». Solo navega.
 *
 * Variables: BASE (web), API_DIRECTA y ORIGEN_PERMITIDO (como en capturas-venta.ts), RAMA, COMMIT.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const API_DIRECTA = process.env.API_DIRECTA;
const ORIGEN_PERMITIDO = process.env.ORIGEN_PERMITIDO ?? 'http://localhost:3000';
const SALIDA = 'public/capturas/venta';

(async () => {
  mkdirSync(SALIDA, { recursive: true });
  const navegador = await chromium.launch({ channel: 'chrome' });
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 627 }, deviceScaleFactor: 1.5, colorScheme: 'light', locale: 'es-PE' });
  if (API_DIRECTA) {
    await contexto.route('**/api/v1/**', async (ruta) => {
      const url = ruta.request().url().replace(new URL(BASE).origin, API_DIRECTA);
      await ruta.fulfill({ response: await ruta.fetch({ url, headers: { ...ruta.request().headers(), origin: ORIGEN_PERMITIDO } }) });
    });
  }
  const page = await contexto.newPage();
  page.setDefaultTimeout(180000);
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill('coordinador@demo.invalid');
  await page.locator('#password').fill('Hesperides2026');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  await page.goto(`${BASE}/mapa`);
  await page.getByRole('button', { name: 'Atardecer' }).click();
  // El atardecer arma luces, sombras y cielo: se le da tiempo a asentarse.
  await page.waitForTimeout(9000);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: `${SALIDA}/mapa-atardecer.png` });
  console.log('mapa-atardecer');

  await page.getByRole('button', { name: 'Modo captura' }).click();
  await page.waitForTimeout(4000);
  // El aviso para salir del modo captura no va en la imagen.
  await page.addStyleTag({ content: '[class*="fixed"]:has(> *), button:has-text("Modo captura") { }' });
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      if (el.textContent?.trim().startsWith('Modo captura:') && el.children.length === 0) (el.closest('div,button') as HTMLElement | null)?.style.setProperty('display', 'none');
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SALIDA}/mapa-atardecer-maqueta.png` });
  console.log('mapa-atardecer-maqueta');
  await navegador.close();

  const rama = process.env.RAMA ?? 'feature/spec-112-atardecer';
  const commit = process.env.COMMIT ?? execSync(`git rev-parse ${rama}`).toString().trim();
  const archivo = `${SALIDA}/origen.json`;
  const origen = existsSync(archivo) ? JSON.parse(readFileSync(archivo, 'utf-8')) : {};
  writeFileSync(archivo, JSON.stringify({ ...origen, mapaAtardecer: { rama, commit, fecha: new Date().toISOString() } }, null, 2));
})();
