/**
 * Capturas del video «¿Qué es Hesperides?» (diseño 2026-11-18-video-que-es-hesperides). Solo navega
 * y lee: no crea ni cambia datos. Prender «Nombres», «Girar» o abrir un desplegable es interfaz.
 *
 * El mapa es el de la rama feature/spec-112-atardecer (aún sin mergear), servido aparte:
 *   git archive feature/spec-112-atardecer frontend shared | tar -x -C <carpeta>
 *   cd <carpeta>/frontend && npm ci
 *   CI=1 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=http://localhost:3019/api/v1 npx next dev -p 3019
 *   BASE=http://localhost:3019 API_DIRECTA=http://localhost:8080 npx tsx scripts/capturas-que-es-hesperides.ts
 *
 * Los giros y el alejamiento se graban cuadro a cuadro con el reloj de Playwright detenido: cada
 * cuadro avanza el tiempo de la página lo mismo, así la cámara del mapa se mueve parejo aunque
 * cada foto tarde distinto. Las secuencias van en JPEG para que pesen poco.
 *
 * Variables: BASE, API_DIRECTA y ORIGEN_PERMITIDO (como en capturas-venta.ts), RAMA, COMMIT y
 * SOLO (secuencias separadas por coma: vuelo, globo, alejar, pantallas).
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const API_DIRECTA = process.env.API_DIRECTA;
const ORIGEN_PERMITIDO = process.env.ORIGEN_PERMITIDO ?? 'http://localhost:3000';
const SALIDA = 'public/capturas/que-es';
const CLAVE_DEMO = 'Hesperides2026';
const SOLO = new Set((process.env.SOLO ?? 'vuelo,globo,alejar,pantallas').split(','));

const ESCRITORIO = { viewport: { width: 1280, height: 627 }, escala: 1.5 };
const TELEFONO = { viewport: { width: 390, height: 780 }, escala: 2 };
/** Un cuadro de video a 30 fps son 33 ms; el mapa avanza su giro una vez por cada 16 ms de reloj. */
const MS_POR_CUADRO = 50;

type Caja = { x: number; y: number; ancho: number; alto: number };
const ARCHIVO_MEDIDAS = `${SALIDA}/medidas.json`;
const medidas: Record<string, unknown> = existsSync(ARCHIVO_MEDIDAS) ? JSON.parse(readFileSync(ARCHIVO_MEDIDAS, 'utf-8')) : {};

/** Lo que no es la maqueta ni los globos: barra, buscador, leyenda, avisos de desarrollo. */
const SOLO_MAQUETA_Y_GLOBOS = `
  nextjs-portal { display: none !important; }
  button:not([aria-label="Globos del mapa"] button), input, [role=combobox], label, fieldset { visibility: hidden !important; }
`;
const SIN_GLOBOS = '[aria-label="Globos del mapa"] { visibility: hidden !important; }';

async function entrar(navegador: Browser, correo: string, pantalla: typeof ESCRITORIO, reloj = false): Promise<Page> {
  const contexto = await navegador.newContext({ viewport: pantalla.viewport, deviceScaleFactor: pantalla.escala, colorScheme: 'light', locale: 'es-PE' });
  if (API_DIRECTA) {
    await contexto.route('**/api/v1/**', async (ruta) => {
      const url = ruta.request().url().replace(new URL(BASE).origin, API_DIRECTA);
      await ruta.fulfill({ response: await ruta.fetch({ url, headers: { ...ruta.request().headers(), origin: ORIGEN_PERMITIDO } }) });
    });
  }
  const page = await contexto.newPage();
  page.setDefaultTimeout(240000);
  page.on('dialog', (d) => void d.dismiss());
  // El reloj falso corre normal hasta que se detiene para grabar cuadro a cuadro.
  if (reloj) await page.clock.install();
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill(correo);
  await page.locator('#password').fill(CLAVE_DEMO);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

/** Cajas de los globos en píxeles de la captura. */
async function globos(page: Page): Promise<Caja[]> {
  const cajas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label="Globos del mapa"] > button')).map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x, y: r.y, ancho: r.width, alto: r.height };
    }),
  );
  const k = ESCRITORIO.escala;
  return cajas.filter((c) => c.ancho > 0).map((c) => ({ x: Math.round(c.x * k), y: Math.round(c.y * k), ancho: Math.round(c.ancho * k), alto: Math.round(c.alto * k) }));
}

/** Pulsa un botón aunque la hoja de estilos lo haya escondido de la foto. */
async function pulsar(page: Page, nombre: string) {
  await page.evaluate((n) => {
    const boton = Array.from(document.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === n);
    if (!boton) throw new Error(`No está el botón ${n}`);
    boton.click();
  }, nombre);
}

/** Graba `cuadros` fotos avanzando el reloj; con `sinGlobos` guarda además la misma toma sin globos. */
async function grabar(page: Page, carpeta: string, cuadros: number, ms: number, sinGlobos = false): Promise<Caja[][]> {
  rmSync(`${SALIDA}/${carpeta}`, { recursive: true, force: true });
  mkdirSync(`${SALIDA}/${carpeta}`, { recursive: true });
  if (sinGlobos) mkdirSync(`${SALIDA}/${carpeta}-sin`, { recursive: true });
  const cajas: Caja[][] = [];
  for (let i = 0; i < cuadros; i++) {
    await page.clock.runFor(ms);
    const n = String(i).padStart(3, '0');
    await page.screenshot({ path: `${SALIDA}/${carpeta}/${n}.jpg`, type: 'jpeg', quality: 88 });
    cajas.push(await globos(page));
    if (sinGlobos) {
      const estilo = await page.addStyleTag({ content: SIN_GLOBOS });
      await page.screenshot({ path: `${SALIDA}/${carpeta}-sin/${n}.jpg`, type: 'jpeg', quality: 88 });
      await estilo.evaluate((e) => (e as Element).remove());
    }
    if (i % 30 === 0) console.log(`${carpeta}: ${i}/${cuadros}`);
  }
  return cajas;
}

async function abrirMapa(page: Page) {
  await page.goto(`${BASE}/mapa`);
  await page.getByRole('button', { name: 'Atardecer' }).click();
  // El atardecer arma luces, sombras y cielo: se le da tiempo a asentarse.
  await page.waitForTimeout(10000);
}

(async () => {
  mkdirSync(SALIDA, { recursive: true });
  const navegador = await chromium.launch({ channel: 'chrome' });

  if (SOLO.has('vuelo') || SOLO.has('globo') || SOLO.has('alejar') || SOLO.has('prueba')) {
    const mapa = await entrar(navegador, 'coordinador@demo.invalid', ESCRITORIO, true);
    await abrirMapa(mapa);

    // Los nombres tapan la maqueta: se apagan (solo cambia la vista).
    await mapa.getByRole('button', { name: 'Nombres' }).click();
    await mapa.getByRole('button', { name: 'Pantalla completa' }).click();
    await mapa.waitForTimeout(2000);

    if (SOLO.has('vuelo')) {
      // Recorrido del campus: la maqueta sola, girando despacio alrededor del centro.
      await mapa.addStyleTag({ content: `${SOLO_MAQUETA_Y_GLOBOS}\n${SIN_GLOBOS}` });
      await pulsar(mapa, 'Girar');
      await mapa.clock.pauseAt(Date.now() + 500);
      medidas.vuelo = await grabar(mapa, 'vuelo', 300, 40);
      // El giro deja la cámara en otro lugar: el globo se graba en otra corrida (SOLO=globo,alejar).
      if (SOLO.has('globo') || SOLO.has('alejar')) throw new Error('Graba «vuelo» en una corrida aparte de «globo» y «alejar»');
    }

    if (SOLO.has('globo') || SOLO.has('alejar') || SOLO.has('prueba')) {
      // El jardín de la incidencia: tocar el grupo de globos lleva la cámara hasta él («Acercar»).
      await mapa.addStyleTag({ content: SOLO_MAQUETA_Y_GLOBOS });
      await mapa.evaluate((texto) => {
        const grupo = Array.from(document.querySelectorAll('[aria-label="Globos del mapa"] > button')).find((b) => b.getAttribute('aria-label')?.startsWith(texto));
        if (!grupo) throw new Error(`No está el globo «${texto}»`);
        (grupo as HTMLButtonElement).click();
      }, process.env.GRUPO ?? 'Grupo de 2 globos');
      await mapa.waitForTimeout(4000);
      // Un poco más lejos y más inclinada: el jardín con su entorno, no visto desde arriba.
      const centro = { x: ESCRITORIO.viewport.width / 2, y: ESCRITORIO.viewport.height / 2 };
      await mapa.mouse.move(centro.x, centro.y);
      for (let i = 0; i < Number(process.env.ALEJAR ?? 12); i++) {
        await mapa.mouse.wheel(0, 200);
        await mapa.waitForTimeout(150);
      }
      await mapa.waitForTimeout(2000);
      if (SOLO.has('prueba')) await mapa.screenshot({ path: `${SALIDA}/prueba-rueda.png` });
      await mapa.mouse.move(centro.x, centro.y + 120);
      await mapa.mouse.down({ button: 'right' });
      for (let i = 1; i <= 12; i++) await mapa.mouse.move(centro.x, centro.y + 120 - i * Number(process.env.INCLINAR ?? 6));
      await mapa.mouse.up({ button: 'right' });
      // El puntero sobre un jardín lo resalta: se deja en una esquina del cielo.
      await mapa.mouse.move(ESCRITORIO.viewport.width - 2, 2);
      await mapa.waitForTimeout(3000);
      await mapa.screenshot({ path: `${SALIDA}/globo-inicio.png` });
      console.log(JSON.stringify(await globos(mapa)));
    }

    if (SOLO.has('globo')) {
      // Momento clave: la cámara orbita alrededor del jardín con el globo. La historia cuenta una
      // sola incidencia: el globo vecino (urgencia media) no sale en esta toma; sigue en el mapa.
      const vecino = await mapa.addStyleTag({ content: '[aria-label="Globos del mapa"] > button[aria-label^="Incidencia media"] { display: none !important; }' });
      await pulsar(mapa, 'Girar');
      await mapa.clock.pauseAt(Date.now() + 500);
      medidas.globo = await grabar(mapa, 'globo', 300, MS_POR_CUADRO, true);
      await pulsar(mapa, 'Girar');
      await mapa.clock.runFor(100);
      await vecino.evaluate((e) => (e as Element).remove());
    }

    if (SOLO.has('alejar')) {
      // Alejamiento lento: del jardín al campus entero, con los globos que piden atención.
      if (!SOLO.has('globo')) await mapa.clock.pauseAt(Date.now() + 500);
      await pulsar(mapa, 'Encuadrar');
      medidas.alejar = await grabar(mapa, 'alejar', 75, 16);
      // Después del vuelo, la vista entera girando apenas para el cierre.
      await pulsar(mapa, 'Girar');
      medidas.final = await grabar(mapa, 'final', 150, MS_POR_CUADRO);
      await pulsar(mapa, 'Girar');
    }
    await mapa.context().close();
  }

  if (SOLO.has('pantallas')) {
    const escritorio = await entrar(navegador, 'coordinador@demo.invalid', ESCRITORIO);
    const foto = async (page: Page, id: string, espera = 2500) => {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      await page.waitForTimeout(espera);
      await page.screenshot({ path: `${SALIDA}/${id}.png` });
      console.log(id);
    };
    await escritorio.goto(`${BASE}/`);
    await foto(escritorio, 'inicio');
    await escritorio.goto(`${BASE}/calendario`);
    await foto(escritorio, 'calendario');
    await escritorio.goto(`${BASE}/reportes`);
    // El reporte semanal con los datos de demostración del propio reporte: se arman en el
    // navegador, sin consultar ni guardar nada en el servidor.
    await escritorio.getByRole('tab', { name: 'Semanal del sector' }).or(escritorio.getByText('Semanal del sector')).first().click();
    await escritorio.getByRole('button', { name: 'Ver con datos de demostración' }).click();
    await foto(escritorio, 'reporte-semanal', 4000);
    await escritorio.mouse.wheel(0, 520);
    await foto(escritorio, 'reporte-semanal-abajo', 1500);
    await escritorio.goto(`${BASE}/incidencias`);
    await foto(escritorio, 'incidencias');
    await escritorio.goto(`${BASE}/intervenciones/3`);
    // Desplegar el historial es interfaz: no cambia la intervención.
    const historial = escritorio.getByText('Historial de la actividad');
    await historial.click();
    await historial.scrollIntoViewIfNeeded();
    await foto(escritorio, 'intervencion-historial');

    // Don Julio cuenta lo de la tubería desde el celular (el formulario no se envía).
    const capataz = await entrar(navegador, 'capataz@demo.invalid', TELEFONO);
    await capataz.goto(`${BASE}/incidencias/nueva`);
    await capataz.locator('textarea').first().fill('Tubería de riego rota en el jardín, sale agua a chorro.');
    await foto(capataz, 'reporte-tuberia');

    const telefono = await entrar(navegador, 'otro-capataz@demo.invalid', TELEFONO);
    await telefono.goto(`${BASE}/incidencias/2`);
    await foto(telefono, 'otro-capataz-incidencia');
  }

  await navegador.close();
  writeFileSync(ARCHIVO_MEDIDAS, JSON.stringify(medidas));
  const rama = process.env.RAMA ?? 'feature/spec-112-atardecer';
  const commit = process.env.COMMIT ?? execSync(`git rev-parse origin/${rama}`).toString().trim();
  writeFileSync(`${SALIDA}/origen.json`, JSON.stringify({ rama, commit, fecha: new Date().toISOString(), secuencias: [...SOLO] }, null, 2));
})();
