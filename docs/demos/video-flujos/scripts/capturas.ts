/**
 * Maneja la web real y guarda una captura por estado, con las medidas de sus elementos.
 * Requiere la aplicación con el perfil dev en http://localhost:3000 y una base recién creada,
 * porque el flujo registra datos de ejemplo (README).
 * Uso: npm run capturas -- [--escena especies]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Locator, type Page } from 'playwright-core';

const BASE = 'http://localhost:3000';
const ESCALA = 1.5;
const SALIDA = 'public/capturas';
const ARCHIVO_MEDIDAS = `${SALIDA}/medidas.json`;
/** Contraseña pública de las cuentas de demostración (docs/demos/incidencias.md). */
const CLAVE_DEMO = 'Hesperides2026';
const OCULTAR_AYUDAS_DE_DESARROLLO = 'nextjs-portal { display: none !important; }';
const ESPERA_DE_PINTADO_MS = 700;
const PASOS_DE_DESPLAZAMIENTO = 6;
const PX_POR_PASO = 45;

type Medida = { x: number; y: number; ancho: number; alto: number };
type Medidas = Record<string, Record<string, Medida>>;

mkdirSync(SALIDA, { recursive: true });
const medidas: Medidas = existsSync(ARCHIVO_MEDIDAS) ? JSON.parse(readFileSync(ARCHIVO_MEDIDAS, 'utf-8')) : {};

async function capturar(page: Page, id: string, elementos: Record<string, Locator> = {}) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.addStyleTag({ content: OCULTAR_AYUDAS_DE_DESARROLLO });
  await page.waitForTimeout(ESPERA_DE_PINTADO_MS);
  await page.screenshot({ path: `${SALIDA}/${id}.png` });

  medidas[id] = {};
  for (const [nombre, elemento] of Object.entries(elementos)) {
    const caja = await elemento.boundingBox();
    if (!caja) throw new Error(`No se ve «${nombre}» en la captura ${id}`);
    medidas[id][nombre] = {
      x: Math.round(caja.x * ESCALA),
      y: Math.round(caja.y * ESCALA),
      ancho: Math.round(caja.width * ESCALA),
      alto: Math.round(caja.height * ESCALA),
    };
  }
  console.log(`${id}: ${Object.keys(medidas[id]).join(', ') || 'sin medidas'}`);
}

async function entrar(page: Page, correo: string) {
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill(correo);
  await page.locator('#password').fill(CLAVE_DEMO);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function especies(page: Page) {
  await entrar(page, 'coordinador@demo.invalid');
  await page.goto(`${BASE}/inventario-verde`);
  await page.locator('a[href*="/inventario-verde/especies/"]').first().waitFor();
  await page.waitForTimeout(1200);
  await page.locator('#species-sort-select').selectOption('count:desc');

  const buscador = page.locator('#species-search-input');
  // Ponciana: su foto de Drive es pública, y la ficha debe mostrar una foto real.
  const especie = page.locator('a[href*="delonix-regia"]').first();
  const etiquetaArbol = page.locator('[role="tablist"]').getByText('Árbol', { exact: false }).first();
  const enlaceRegistrar = page.locator('a[href="/inventario-verde/registrar"]').first();

  await capturar(page, 'catalogo', {
    buscador,
    etiquetaArbol,
    enlaceRegistrar,
    tarjeta: especie,
    conteo: page.getByText(/Mostrando/).first(),
  });

  // Un desplazamiento real: la tarjeta entera no cabe en el primer pantallazo.
  for (let paso = 1; paso <= PASOS_DE_DESPLAZAMIENTO; paso++) {
    await page.evaluate((y) => window.scrollTo(0, y), paso * PX_POR_PASO);
    await capturar(page, `catalogo-bajando-${paso}`, paso < PASOS_DE_DESPLAZAMIENTO ? {} : {
      tarjeta: especie,
      comun: especie.locator('h3'),
      cientifico: especie.locator('p').first(),
      familia: especie.getByText(/^Fam\./),
      tipo: especie.getByText('Árbol', { exact: true }),
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const busqueda = 'ponciana';
  for (let letras = 1; letras <= busqueda.length; letras++) {
    await buscador.fill(busqueda.slice(0, letras));
    await page.waitForTimeout(450);
    await capturar(page, `catalogo-busqueda-${letras}`);
  }

  await etiquetaArbol.click();
  await capturar(page, 'catalogo-filtrado', { tarjeta: especie });

  await especie.click();
  await page.waitForURL('**/especies/delonix-regia');
  await capturar(page, 'ficha');

  await enlaceRegistrar.click();
  await page.waitForURL('**/inventario-verde/registrar');
  const nombre = page.locator('#scientific-name');
  await capturar(page, 'registro');

  const nombreCientifico = 'Tabebuia rosea';
  for (const letras of [4, 8, 11, 14]) {
    await nombre.fill(nombreCientifico.slice(0, letras));
    await capturar(page, `registro-${letras}`);
  }

  const boton = page.getByRole('button', { name: 'Registrar especie' });
  await boton.scrollIntoViewIfNeeded();
  await capturar(page, 'registro-boton', { boton });
  await boton.click();
  await page.getByText('Especie registrada exitosamente').waitFor();
  await capturar(page, 'registro-listo');
}

async function bajarHasta(elemento: Locator) {
  await elemento.scrollIntoViewIfNeeded();
  await elemento.evaluate((nodo) => nodo.scrollIntoView({ block: 'center' }));
}

async function ejemplares(page: Page) {
  await entrar(page, 'coordinador@demo.invalid');

  await page.goto(`${BASE}/catastro/ejemplares`);
  const primero = page.locator('a[href*="/ejemplares/EV-"]').first();
  await primero.waitFor();
  await capturar(page, 'ejemplares', {
    primero,
    censado: page.getByText('Catastro censado:'),
    codigo: primero.getByText(/EV-\d+/).first(),
    enlaceRegistrar: page.locator('a[href="/catastro/registrar"]').first(),
  });

  await page.goto(`${BASE}/catastro/registrar`);
  const especie = page.locator('#especie');
  await especie.waitFor();
  await capturar(page, 'planta', { especie });

  await especie.fill('Ponciana');
  await page.getByRole('button', { name: /Delonix regia/ }).click();
  await capturar(page, 'planta-especie', { especie });

  const lat = page.locator('#lat');
  const mapa = page.getByText('Haz clic donde está la planta');
  await lat.fill('-12.072013');
  await page.locator('#lon').fill('-77.079314');
  await bajarHasta(mapa);
  await capturar(page, 'planta-punto', { mapa, lat });

  const hoy = new Date().toISOString().slice(0, 10);
  await page.getByText('Medición (opcional)').click();
  await page.locator('#fecha-medicion').fill(hoy);
  const altura = page.locator('#altura');
  await altura.fill('6.5');
  await page.locator('#dap').fill('40');
  await page.locator('#copa').fill('3.2');
  await bajarHasta(altura);
  await capturar(page, 'planta-medicion', { altura });

  await page.getByText('Evaluación (opcional)').click();
  const fechaEvaluacion = page.locator('#fecha-evaluacion');
  await fechaEvaluacion.fill(hoy);
  await page.locator('input[name="eval-hasDeadBranches"]').first().check();
  await page.locator('#manejo').fill('Retirar ramas secas');
  await bajarHasta(fechaEvaluacion);
  await capturar(page, 'planta-evaluacion', { fechaEvaluacion });

  const registrar = page.getByRole('button', { name: 'Registrar planta' });
  await bajarHasta(registrar);
  await capturar(page, 'planta-boton', { registrar });
  await registrar.click();

  const aviso = page.getByRole('alertdialog');
  await aviso.waitFor();
  await bajarHasta(aviso);
  const esOtra = page.getByRole('button', { name: 'No, es otro: registrar' });
  await capturar(page, 'planta-aviso', { aviso, esOtra, revisar: page.getByRole('button', { name: 'Revisar el punto' }) });
  await esOtra.click();
  await page.getByText('Planta registrada').waitFor();
  await capturar(page, 'planta-lista', { enlaceImportar: page.locator('a[href="/catastro/importar"]').first() });
  const registro = await page.getByText(/Se registró como/).textContent();
  const codigo = registro?.match(/EV-\d+/)?.[0];
  if (!codigo) throw new Error('No se leyó el código de la planta registrada');

  await page.goto(`${BASE}/catastro/importar`);
  const archivo = page.locator('#archivo-csv');
  await archivo.waitFor();
  const revisar = page.getByRole('button', { name: 'Revisar archivo' });
  await capturar(page, 'importar', { archivo, revisar });
  await archivo.setInputFiles('scripts/carga-ejemplo.csv');
  await capturar(page, 'importar-archivo', { archivo, revisar });
  await revisar.click();

  const vista = page.getByText('2. Revisa lo que se cargará');
  await vista.waitFor();
  await bajarHasta(vista);
  const confirmar = page.getByRole('button', { name: 'Confirmar carga' });
  await capturar(page, 'importar-vista', { vista });
  await page.getByRole('button', { name: 'Ingresar todos' }).click();
  await bajarHasta(confirmar);
  await capturar(page, 'importar-decidido', { confirmar });
  await confirmar.click();
  await page.getByText('Carga confirmada').waitFor();
  await capturar(page, 'importar-listo');

  // La ficha es la de la planta que se acaba de registrar: la historia queda conectada.
  await page.goto(`${BASE}/inventario-verde/especies/delonix-regia/ejemplares/${codigo}`);
  await page.getByText(codigo).first().waitFor();
  await page.waitForTimeout(1500);
  await capturar(page, 'ejemplar', {
    ubicacion: page.getByText('GPS:'),
    medidas: page.getByText(/Dimensiones Dendrom/i).first(),
  });
  const historial = page.getByText('Evaluaciones Fitosanitarias');
  await bajarHasta(historial);
  await capturar(page, 'ejemplar-historial', { historial });
}

async function nuevaSesion(page: Page, correo: string) {
  const contexto = await page.context().browser()!.newContext({
    viewport: { width: 1280, height: 627 },
    deviceScaleFactor: ESCALA,
    colorScheme: 'light',
    locale: 'es-PE',
  });
  const otra = await contexto.newPage();
  otra.setDefaultTimeout(120000);
  await entrar(otra, correo);
  return otra;
}

async function planificar(page: Page, descripcion: string) {
  await page.locator('#work-description').fill(descripcion);
  const yaRealizado = page.getByLabel('Trabajo ya realizado');
  if (await yaRealizado.isChecked()) await yaRealizado.uncheck();
  await page.getByRole('button', { name: 'Planificar intervención' }).click();
  await page.getByText(descripcion).first().waitFor();
}

async function incidencias(page: Page) {
  await entrar(page, 'capataz@demo.invalid');

  await page.goto(`${BASE}/incidencias`);
  await page.getByRole('link', { name: 'Informar una incidencia' }).waitFor();
  await capturar(page, 'incidencias', { informar: page.getByRole('link', { name: 'Informar una incidencia' }) });

  await page.goto(`${BASE}/incidencias/nueva`);
  const descripcion = page.locator('#incident-description');
  await descripcion.waitFor();
  const elementosDeCaptura = {
    descripcion,
    fotos: page.getByText('Añadir fotos', { exact: true }),
    tomarFoto: page.getByText('Tomar foto', { exact: true }),
    ubicacion: page.getByText('Añadir ubicación (opcional)'),
    enviar: page.getByRole('button', { name: 'Enviar' }),
  };
  await capturar(page, 'incidencia-nueva', elementosDeCaptura);

  const texto = 'Rama caída en la puerta principal';
  for (const letras of [5, 10, 18, 26, texto.length]) {
    await descripcion.fill(texto.slice(0, letras));
    await capturar(page, `incidencia-texto-${letras}`, letras === texto.length ? elementosDeCaptura : {});
  }
  await page.getByRole('button', { name: 'Enviar' }).click();
  await page.waitForURL(/\/incidencias\/\d+/);
  const ruta = new URL(page.url()).pathname;
  await page.getByRole('heading', { name: /Incidencia #/ }).waitFor();
  await capturar(page, 'incidencia-recibida', { estado: page.getByText('Pendiente de aprobación').first() });

  const coordinador = await nuevaSesion(page, 'coordinador@demo.invalid');
  await coordinador.goto(`${BASE}${ruta}`);
  const aprobar = coordinador.getByRole('button', { name: 'Aprobar registro' });
  await aprobar.waitFor();
  await coordinador.locator('#review-urgency').selectOption('HIGH').catch(async () => {
    await coordinador.locator('#review-urgency').click();
    await coordinador.getByRole('option', { name: 'Alta' }).click();
  });
  await capturar(coordinador, 'revision', {
    original: coordinador.getByText('Información recibida'),
    tipo: coordinador.locator('#review-type'),
    urgencia: coordinador.locator('#review-urgency'),
    cuadrilla: coordinador.locator('#review-team'),
    provisional: coordinador.getByText(/Categorías provisionales/),
  });
  const urgencia = coordinador.locator('#review-urgency');
  await bajarHasta(urgencia);
  await capturar(coordinador, 'revision-campos', {
    tipo: coordinador.locator('#review-type'),
    urgencia,
    cuadrilla: coordinador.locator('#review-team'),
  });
  await bajarHasta(aprobar);
  await capturar(coordinador, 'revision-aprobar', { aprobar });
  await aprobar.click();
  await coordinador.getByText('Registro aprobado.').waitFor();
  await coordinador.evaluate(() => window.scrollTo(0, 0));
  await capturar(coordinador, 'incidencia-aprobada', {
    estado: coordinador.getByText('Pendiente de atención').first(),
    mensaje: coordinador.locator('blockquote'),
  });

  await planificar(coordinador, 'Retirar la rama de la puerta');
  await planificar(coordinador, 'Limpiar la zona');
  const trabajos = coordinador.getByText('Intervenciones vinculadas');
  await bajarHasta(trabajos);
  await capturar(coordinador, 'incidencia-planificada', { trabajos });

  await page.reload();
  const marcar = page.getByRole('button', { name: 'Marcar realizada' });
  await marcar.first().waitFor();
  await bajarHasta(marcar.first());
  await capturar(page, 'atencion-pendiente', { marcar: marcar.first() });
  await marcar.first().click();
  await page.getByText('Intervención marcada como realizada.').waitFor();
  await bajarHasta(marcar.first());
  await capturar(page, 'atencion-parcial', { marcar: marcar.first(), trabajos: page.getByText('Limpiar la zona').first() });
  await marcar.first().click();
  const resolver = page.getByRole('button', { name: 'Resolver incidencia' });
  await bajarHasta(resolver);
  await page.waitForTimeout(800);
  await capturar(page, 'atencion-completa', { resolver });
  await resolver.click();
  await page.getByText('Incidencia resuelta.').waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capturar(page, 'incidencia-resuelta', { estado: page.getByText('Resuelta').first() });
  const historial = page.getByText('Historial', { exact: true });
  await bajarHasta(historial);
  await capturar(page, 'incidencia-historial', { historial });

  await coordinador.goto(`${BASE}/incidencias`);
  const tablero = coordinador.getByText('Resumen de atención');
  await tablero.waitFor();
  await coordinador.waitForTimeout(800);
  await capturar(coordinador, 'tablero', { tablero, metricas: coordinador.getByRole('region', { name: 'Tablero de incidencias' }) });
}

/** Otra incidencia, aún pendiente: la del recorrido ya quedó resuelta al hablar de las categorías. */
async function pendiente(page: Page) {
  await entrar(page, 'coordinador@demo.invalid');
  await page.goto(`${BASE}/incidencias`);
  await page.locator('a[href^="/incidencias/"]', { hasText: 'Pendiente de aprobación' }).first().click();
  await page.getByRole('button', { name: 'Aprobar registro' }).waitFor();
  await capturar(page, 'otra-incidencia', { provisional: page.getByText(/Categorías provisionales/) });
}

const ESCENAS: Record<string, (page: Page) => Promise<void>> = { especies, ejemplares, incidencias, pendiente };

const indice = process.argv.indexOf('--escena');
const pedidas = indice === -1 ? Object.keys(ESCENAS) : [process.argv[indice + 1]];

const navegador = await chromium.launch({ channel: 'chrome' });
for (const id of pedidas) {
  const flujo = ESCENAS[id];
  if (!flujo) throw new Error(`No hay capturas para la escena ${id}`);
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 627 },
    deviceScaleFactor: ESCALA,
    colorScheme: 'light',
    locale: 'es-PE',
  });
  const page = await contexto.newPage();
  // La primera visita a cada ruta compila en el servidor de desarrollo.
  page.setDefaultTimeout(120000);
  await flujo(page);
  await contexto.close();
}
await navegador.close();
writeFileSync(ARCHIVO_MEDIDAS, JSON.stringify(medidas, null, 2));
