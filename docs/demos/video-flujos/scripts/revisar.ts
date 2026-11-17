/**
 * Bucle de revisión de fotogramas (ideas de las «reviewsheets» de anabology y del control de
 * calidad de Portals): renderiza cuadros sueltos de cada escena, arma una hoja de contactos y mide
 * determinismo y parpadeo. Se corre después de cada cambio visual y se MIRA la hoja.
 *
 * Uso: npm run revisar -- [--video VideoHistoria] [--corrida 7] [--claves h2:0.45,h10:0.47]
 *                         [--sin-frases] [--estatico h11:0.9] [--escena solucion]
 *
 * - Por escena: inicio, mitad y final; con frases (por defecto) un cuadro más dentro de cada frase.
 * - La mitad y los cuadros por frase rotan con `--corrida` (si falta, se usa la siguiente a la última
 *   guardada en out/revision/corrida.txt): así no se optimiza el video para cuadros fijos.
 * - Los momentos clave (`--claves`) son golpes que hay que ver siempre (la rama, el sello, el mapa).
 * - Determinismo: renderiza dos veces el mismo cuadro y compara bytes y píxeles. Debe dar igual.
 * - Parpadeo: entre el cuadro N y N+2 de un plano quieto (`--estatico`), grilla de 16×9 celdas,
 *   proporción de píxeles que cambian más de 26/255. Se informa el promedio y la peor celda.
 *
 * Lista fija para revisar la hoja (no cambia entre corridas):
 *   1. Subtítulos legibles: completos, dentro de la banda, sin taparse con nada.
 *   2. Nadie cortado: personas, Hespo y objetos enteros salvo que salgan de cuadro a propósito.
 *   3. Superposiciones dentro de su destino: checks y pulsos dentro del mapa, resaltes sobre su campo,
 *      sello y tarjetas sin tapar la cara de nadie.
 *   4. Continuidad de color: misma paleta y tinte entre escenas vecinas, sin saltos de luz.
 *   5. Golpes legibles: la rama, el brote, el sello y el mapa se entienden en un cuadro.
 *   6. Nada de cuadros vacíos o negros, salvo fundidos.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { FPS, type Linea } from '../src/tiempos';
import { compararPixeles, leerClaves, metricaParpadeo, muestrasDeRevision } from './revision';

const FFMPEG = path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const CLAVES_HISTORIA = 'h2:0.45,h6:0.08,h6:0.2,h9:0.22,h9:0.3,h10:0.45,h10:0.5,h10:0.64';

const valor = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const bandera = (nombre: string) => process.argv.includes(`--${nombre}`);

const video = valor('video') ?? 'VideoHistoria';
const carpeta = path.resolve('out/revision');
mkdirSync(carpeta, { recursive: true });
const archivoCorrida = path.join(carpeta, 'corrida.txt');
const corrida = Number(valor('corrida') ?? (existsSync(archivoCorrida) ? Number(readFileSync(archivoCorrida, 'utf-8')) + 1 : 1));
writeFileSync(archivoCorrida, String(corrida));

/** Píxeles RGB de un PNG, decodificado con el ffmpeg que trae Remotion. */
function pixeles(png: string): Uint8Array {
  return new Uint8Array(execFileSync(FFMPEG, ['-v', 'error', '-i', png, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 * 1024 * 1024 }));
}

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: video });
const linea = composition.props.linea as Linea;
const navegador = await openBrowser('chrome');
const render = async (frame: number, output: string) => {
  await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props, puppeteerInstance: navegador });
};

const escenaPedida = valor('escena');
const claves = leerClaves(valor('claves') ?? (video === 'VideoHistoria' ? CLAVES_HISTORIA : ''));
const muestras = muestrasDeRevision(linea, { corrida, claves, porFrase: !bandera('sin-frases') }).filter((m) => !escenaPedida || m.escena === escenaPedida);

const dir = path.join(carpeta, `corrida-${corrida}`);
mkdirSync(dir, { recursive: true });
const hoja: { archivo: string; etiqueta: string }[] = [];
for (const m of muestras) {
  const archivo = path.join(dir, `${String(m.frame).padStart(5, '0')}.png`);
  await render(m.frame, archivo);
  const etiqueta = `${m.frame} · ${(m.frame / FPS).toFixed(2)} s · ${m.etiqueta}`;
  hoja.push({ archivo, etiqueta });
  console.log(etiqueta);
}

// Determinismo: el mismo cuadro dos veces.
const cuadroDet = muestras[Math.floor(muestras.length / 2)]?.frame ?? 0;
const detA = path.join(dir, `det-a.png`);
const detB = path.join(dir, `det-b.png`);
await render(cuadroDet, detA);
await render(cuadroDet, detB);
const mismosBytes = readFileSync(detA).equals(readFileSync(detB));
const det = compararPixeles(pixeles(detA), pixeles(detB));

// Parpadeo en un plano quieto: N contra N+2.
const [idQuieto, fraccionQuieto] = (valor('estatico') ?? (video === 'VideoHistoria' ? 'h11:0.9' : `${linea.escenas[0].frases[0].frase.id}:0.5`)).split(':');
const tramoQuieto = linea.escenas.flatMap((e) => e.frases).find((t) => t.frase.id === idQuieto);
if (!tramoQuieto) throw new Error(`No existe la frase ${idQuieto}`);
const n = tramoQuieto.desde + Math.round(Number(fraccionQuieto) * tramoQuieto.frames);
const pa = path.join(dir, `parpadeo-a.png`);
const pb = path.join(dir, `parpadeo-b.png`);
await render(n, pa);
await render(n + 2, pb);
const parpadeo = metricaParpadeo(pixeles(pa), pixeles(pb), composition.width, composition.height);
await navegador.close({ silent: true });

const informe = {
  video,
  corrida,
  determinismo: { frame: cuadroDet, mismosBytes, mismosPixeles: det.iguales, pixelesDistintos: det.distintos },
  parpadeo: { frame: n, global: Number(parpadeo.global.toFixed(4)), peorCelda: Number(parpadeo.peorCelda.toFixed(4)) },
  muestras: hoja.map((h) => h.etiqueta),
};
writeFileSync(path.join(carpeta, `informe-${corrida}.json`), JSON.stringify(informe, null, 2));
const salidaHoja = path.join(carpeta, `hoja-${corrida}.png`);
writeFileSync(path.join(dir, 'hoja.json'), JSON.stringify({ salida: salidaHoja, titulo: `${video} · corrida ${corrida}`, cuadros: hoja }));
execFileSync('python', [path.resolve('scripts/hoja_revision.py'), path.join(dir, 'hoja.json')], { stdio: 'inherit' });

console.log(`\nHoja: ${salidaHoja}`);
console.log(`Determinismo (fotograma ${cuadroDet}): bytes ${mismosBytes ? 'iguales' : 'DISTINTOS'}, píxeles ${det.iguales ? 'iguales' : `${det.distintos} DISTINTOS`}`);
console.log(`Parpadeo ${n}→${n + 2}: promedio ${(parpadeo.global * 100).toFixed(2)} %, peor celda ${(parpadeo.peorCelda * 100).toFixed(1)} %`);
console.log('Revisa: subtítulos legibles · nadie cortado · superposiciones dentro de su destino · continuidad de color · golpes legibles · sin cuadros vacíos');
if (!det.iguales) process.exit(1);
