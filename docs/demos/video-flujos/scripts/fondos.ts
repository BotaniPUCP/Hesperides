/**
 * Pre-renderiza las hojas de papel recortado de la historia a PNG transparentes, una vez: así el
 * video no recalcula el ruido, el corte ondulado ni la sombra en cada cuadro.
 * Uso: npm run fondos   (deja public/fondos/v<VERSION_FONDOS>/<hoja>.png y manifiesto.json)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { HOJAS, rutaHoja, rutaManifiestoFondos, VERSION_FONDOS } from '../src/historia/papel';

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const navegador = await openBrowser('chrome');
for (const h of HOJAS) {
  const inputProps = { hoja: h.id };
  const composition = await selectComposition({ serveUrl, id: 'HojaDeFondo', inputProps, puppeteerInstance: navegador });
  const output = path.resolve('public', rutaHoja(h.id));
  mkdirSync(path.dirname(output), { recursive: true });
  await renderStill({ composition, serveUrl, output, frame: 0, inputProps, imageFormat: 'png', puppeteerInstance: navegador });
  console.log(output);
}
await navegador.close({ silent: true });
writeFileSync(path.resolve('public', rutaManifiestoFondos()), JSON.stringify({ version: VERSION_FONDOS, hojas: HOJAS.map((h) => h.id) }, null, 2));
