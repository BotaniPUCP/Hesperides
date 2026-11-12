/**
 * Renderiza los fotogramas clave de cada frase para revisarlos.
 * Uso: npm run fotogramas -- [--escena inicio] [--momentos e4:0.7,e6:0.13]
 * `--momentos` revisa un instante exacto de una frase, como una pulsación.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { framesClave, type Linea } from '../src/tiempos';

const valor = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const escenaPedida = valor('escena');
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'VideoFlujos' });
const linea = composition.props.linea as Linea;

const momentos = valor('momentos');
if (momentos) {
  mkdirSync('out/momentos', { recursive: true });
  const tramos = linea.escenas.flatMap((e) => e.frases);
  for (const momento of momentos.split(',')) {
    const [id, fraccion] = momento.split(':');
    const tramo = tramos.find((t) => t.frase.id === id);
    if (!tramo) throw new Error(`No existe la frase ${id}`);
    const frame = tramo.desde + Math.round(Number(fraccion) * tramo.frames);
    const output = `out/momentos/${id}-${fraccion}.png`;
    await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props });
    console.log(`${output} (fotograma ${frame})`);
  }
  process.exit(0);
}

const escena = linea.escenas.find((e) => e.id === escenaPedida);
if (escenaPedida && !escena) throw new Error(`No existe la escena ${escenaPedida}`);
const ids = new Set((escena ? [escena] : linea.escenas).flatMap((e) => e.frases.map((f) => f.frase.id)));

mkdirSync('out/fotogramas', { recursive: true });
for (const { id, frame, momento } of framesClave(linea).filter((c) => ids.has(c.id))) {
  const output = `out/fotogramas/${id}-${momento}.png`;
  await renderStill({ composition, serveUrl, output, frame, inputProps: composition.props });
  console.log(`${output} (fotograma ${frame})`);
}
