/**
 * Duración de un video a partir de su guion y su manifiesto de voz, sin renderizar.
 * Uso: npm run duracion -- --guion guion-planificacion.json --voz public/voz/planificacion [--escena planificacion]
 * Con --escena imprime además el rango de fotogramas de esa escena, para renderizar solo ella.
 * Sale con código 1 si queda fuera de 3:30–4:30 (CE-01 del video de planificación).
 */
import { readFileSync } from 'node:fs';
import type { Guion } from '../src/guion';
import { construirLinea, FPS, type Manifiesto } from '../src/tiempos';

const MINIMO_S = 210;
const MAXIMO_S = 270;

const valor = (nombre: string, porDefecto: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : process.argv[i + 1];
};

const leer = <T>(ruta: string): T => JSON.parse(readFileSync(ruta, 'utf-8')) as T;
const minutos = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.round(segundos % 60)).padStart(2, '0')}`;

const guion = leer<Guion>(valor('guion', 'guion.json'));
const manifiesto = leer<Manifiesto>(`${valor('voz', 'public/voz')}/manifiesto.json`);
const linea = construirLinea(guion, manifiesto);
const segundos = linea.framesTotales / FPS;

console.log(`${minutos(segundos)} (${linea.framesTotales} fotogramas)`);
const escenaPedida = process.argv.indexOf('--escena') === -1 ? undefined : valor('escena', '');
if (escenaPedida) {
  const escena = linea.escenas.find((e) => e.id === escenaPedida);
  if (!escena) throw new Error(`No existe la escena ${escenaPedida}`);
  console.log(`${escena.id}: ${escena.desde}-${escena.desde + escena.frames - 1}`);
}
if (segundos < MINIMO_S || segundos > MAXIMO_S) {
  console.error(`Fuera de ${minutos(MINIMO_S)}–${minutos(MAXIMO_S)}`);
  process.exit(1);
}
