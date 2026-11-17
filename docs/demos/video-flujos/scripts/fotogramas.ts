/**
 * Renderiza los fotogramas clave de cada frase para revisarlos.
 * Uso: npm run fotogramas -- [--video VideoPlanificacion] [--escena inicio] [--momentos e4:0.7,e6:0.13]
 * `--momentos` revisa un instante exacto de una frase, como una pulsación; `--cuadros 120,300`,
 * cuadros exactos del video (los cortes entre escenas no caen dentro de una frase).
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { framesClave, type Linea } from '../src/tiempos';

const valor = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const escenaPedida = valor('escena');
const video = valor('video') ?? 'VideoFlujos';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
// Un solo navegador para todos los fotogramas: abrir uno por cuadro es lento y a veces no llega a tiempo.
const puppeteerInstance = await openBrowser('chrome');
const composition = await selectComposition({ serveUrl, id: video, puppeteerInstance, timeoutInMilliseconds: 120000 });
const linea = composition.props.linea as Linea;

const cuadros = valor('cuadros');
if (cuadros) {
  mkdirSync(`out/momentos/${video}`, { recursive: true });
  for (const frame of cuadros.split(',').map(Number)) {
    const output = `out/momentos/${video}/cuadro-${frame}.png`;
    await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props, puppeteerInstance, timeoutInMilliseconds: 120000 });
    console.log(output);
  }
  await puppeteerInstance.close({ silent: true });
  process.exit(0);
}

const momentos = valor('momentos');
if (momentos) {
  mkdirSync(`out/momentos/${video}`, { recursive: true });
  const tramos = linea.escenas.flatMap((e) => e.frases);
  for (const momento of momentos.split(',')) {
    const [id, fraccion] = momento.split(':');
    const tramo = tramos.find((t) => t.frase.id === id);
    if (!tramo) throw new Error(`No existe la frase ${id}`);
    const frame = tramo.desde + Math.round(Number(fraccion) * tramo.frames);
    const output = `out/momentos/${video}/${id}-${fraccion}.png`;
    await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props, puppeteerInstance, timeoutInMilliseconds: 120000 });
    console.log(`${output} (fotograma ${frame})`);
  }
  await puppeteerInstance.close({ silent: true });
  process.exit(0);
}

const escena = linea.escenas.find((e) => e.id === escenaPedida);
if (escenaPedida && !escena) throw new Error(`No existe la escena ${escenaPedida}`);
const ids = new Set((escena ? [escena] : linea.escenas).flatMap((e) => e.frases.map((f) => f.frase.id)));

mkdirSync(`out/fotogramas/${video}`, { recursive: true });
for (const { id, frame, momento } of framesClave(linea).filter((c) => ids.has(c.id))) {
  const output = `out/fotogramas/${video}/${id}-${momento}.png`;
  await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props, puppeteerInstance, timeoutInMilliseconds: 120000 });
  console.log(`${output} (fotograma ${frame})`);
}
await puppeteerInstance.close({ silent: true });
