/**
 * Piezas comunes de las capturas del video de planificación: el navegador, la entrada con una
 * cuenta de demostración, las capturas con medidas y la API autenticada. Las capturas se guardan
 * aparte hasta que la sesión termina sin errores: si algo falla, no quedan medidas a medias.
 * `scripts/capturas.ts` (primer video) no usa este módulo y no cambia.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Locator, type Page } from 'playwright-core';

export const BASE = 'http://localhost:3000';
export const API = 'http://localhost:8080/api/v1';
export const SALIDA = 'public/capturas/planificacion';
/** Contraseña pública de las cuentas de demostración (R__seed_demo_incidents.sql). */
export const CLAVE_DEMO = 'Hesperides2026';

const ESCALA = 1.5;
const VENTANA = { width: 1280, height: 627 };
const OCULTAR_AYUDAS_DE_DESARROLLO = 'nextjs-portal { display: none !important; }';
const ESPERA_DE_PINTADO_MS = 700;
const ESPERA_DE_ELEMENTO_MS = 10000;
const ARCHIVO_MEDIDAS = `${SALIDA}/medidas.json`;
const ARCHIVO_ORIGEN = `${SALIDA}/origen.json`;

type Medida = { x: number; y: number; ancho: number; alto: number };
/** Una caja en píxeles CSS de la ventana, para lo que no es un elemento, como un punto del mapa. */
export type Caja = { x: number; y: number; width: number; height: number };
export type Capturar = (page: Page, id: string, elementos?: Record<string, Locator | Caja>) => Promise<void>;
type Medidas = Record<string, Record<string, Medida>>;
export type Origen = { rama: string; commit: string; fecha: string };

/** La parte de una caja que cae dentro de la ventana; null si no se ve nada. */
function recortar(caja: Caja): Caja | null {
  const x = Math.max(0, caja.x);
  const y = Math.max(0, caja.y);
  const derecha = Math.min(VENTANA.width, caja.x + caja.width);
  const abajo = Math.min(VENTANA.height, caja.y + caja.height);
  return derecha > x && abajo > y ? { x, y, width: derecha - x, height: abajo - y } : null;
}

/** La caja que abarca varios elementos, como un título con sus opciones. */
export async function union(...elementos: Locator[]): Promise<Caja> {
  const cajas = await Promise.all(elementos.map((e) => e.boundingBox()));
  if (cajas.some((c) => !c)) throw new Error('Un elemento de la unión no se ve');
  const validas = cajas as Caja[];
  const x = Math.min(...validas.map((c) => c.x));
  const y = Math.min(...validas.map((c) => c.y));
  return { x, y, width: Math.max(...validas.map((c) => c.x + c.width)) - x, height: Math.max(...validas.map((c) => c.y + c.height)) - y };
}

/** Un punto como caja chica centrada en él. */
export const punto = (x: number, y: number, lado = 16): Caja => ({ x: x - lado / 2, y: y - lado / 2, width: lado, height: lado });

const leerJson = <T>(ruta: string, vacio: T): T => (existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf-8')) as T) : vacio);

/** Una sesión de capturas: acumula en memoria y en una carpeta temporal hasta `guardar`. */
export function crearSesionDeCapturas(sesion: string) {
  const temporal = `${SALIDA}/.tmp-${sesion}`;
  rmSync(temporal, { recursive: true, force: true });
  mkdirSync(temporal, { recursive: true });
  const medidas: Medidas = {};

  const capturar: Capturar = async (page, id, elementos = {}) => {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await page.addStyleTag({ content: OCULTAR_AYUDAS_DE_DESARROLLO });
    await page.waitForTimeout(ESPERA_DE_PINTADO_MS);
    const propias: Record<string, Medida> = {};
    for (const [nombre, elemento] of Object.entries(elementos)) {
      // Si un texto de la web cambió, el elemento no aparece: se falla pronto y nombrándolo.
      const caja = 'boundingBox' in elemento ? await elemento.boundingBox({ timeout: ESPERA_DE_ELEMENTO_MS }).catch(() => null) : elemento;
      const visible = caja && recortar(caja);
      if (!visible) throw new Error(`No se ve «${nombre}» en la captura ${id}`);
      propias[nombre] = {
        x: Math.round(visible.x * ESCALA),
        y: Math.round(visible.y * ESCALA),
        ancho: Math.round(visible.width * ESCALA),
        alto: Math.round(visible.height * ESCALA),
      };
    }
    await page.screenshot({ path: `${temporal}/${id}.png` });
    medidas[id] = propias;
    console.log(`${id}: ${Object.keys(propias).join(', ') || 'sin medidas'}`);
  };

  /** Pasa las capturas a su lugar y suma sus medidas a las de la otra sesión. */
  function guardar(origen: Origen) {
    for (const archivo of readdirSync(temporal)) renameSync(`${temporal}/${archivo}`, `${SALIDA}/${archivo}`);
    rmSync(temporal, { recursive: true, force: true });
    writeFileSync(ARCHIVO_MEDIDAS, JSON.stringify({ ...leerJson<Medidas>(ARCHIVO_MEDIDAS, {}), ...medidas }, null, 2));
    writeFileSync(ARCHIVO_ORIGEN, JSON.stringify({ ...leerJson<Record<string, Origen>>(ARCHIVO_ORIGEN, {}), [sesion]: origen }, null, 2));
  }

  return { capturar, guardar };
}

export async function abrirNavegador(): Promise<Browser> {
  return chromium.launch({ channel: 'chrome' });
}

export async function nuevaPagina(navegador: Browser, correo: string): Promise<Page> {
  const contexto = await navegador.newContext({ viewport: VENTANA, deviceScaleFactor: ESCALA, colorScheme: 'light', locale: 'es-PE' });
  const page = await contexto.newPage();
  // Salir de un formulario con cambios pide confirmación: en las capturas siempre se sale.
  page.on('dialog', (dialogo) => void dialogo.accept());
  // La primera visita a cada ruta compila en el servidor de desarrollo.
  page.setDefaultTimeout(120000);
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill(correo);
  await page.locator('#password').fill(CLAVE_DEMO);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  return page;
}

export type Api = (<T = unknown>(metodo: string, ruta: string, cuerpo?: unknown) => Promise<T>) & {
  /** Sube un archivo como `multipart/form-data` en el campo `file`. */
  subir: (ruta: string, nombre: string, bytes: Uint8Array, tipo: string) => Promise<void>;
};

/** La API con la sesión de una cuenta de demostración. Falla con el mensaje del backend. */
export async function crearApi(correo: string): Promise<Api> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password: CLAVE_DEMO }),
  });
  if (!login.ok) throw new Error(`No se pudo entrar como ${correo}: ${login.status}`);
  const token = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;

  const pedir = async <T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> => {
    const respuesta = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // Las altas exigen una clave de idempotencia (SPEC-200).
        ...(metodo === 'GET' ? {} : { 'Idempotency-Key': randomUUID() }),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await respuesta.text();
    if (!respuesta.ok) throw new Error(`${metodo} ${ruta} → ${respuesta.status}: ${texto.slice(0, 400)}`);
    return (texto ? (JSON.parse(texto) as { data: T }).data : undefined) as T;
  };

  const subir = async (ruta: string, nombre: string, bytes: Uint8Array, tipo: string) => {
    const formulario = new FormData();
    formulario.append('file', new Blob([bytes], { type: tipo }), nombre);
    const respuesta = await fetch(`${API}${ruta}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() },
      body: formulario,
    });
    if (!respuesta.ok) throw new Error(`PUT ${ruta} → ${respuesta.status}: ${(await respuesta.text()).slice(0, 400)}`);
  };

  return Object.assign(pedir, { subir });
}
