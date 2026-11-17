// Cuándo suena cada efecto de la historia (WAV sintetizados con scripts/generar_efectos.py).
import type { Linea, TramoEscena } from '../tiempos';
import { fraseActiva } from '../tiempos';
import { momentoDe } from '../ui/anim';
import { golpesDeHistoria } from './impacto';
import { fraccionesH10 } from './posiciones';

export const EFECTOS = ['whoosh', 'clic', 'pop', 'ding', 'sello', 'crujido'] as const;
export type Efecto = (typeof EFECTOS)[number];
export type Disparo = { efecto: Efecto; frame: number; volumen: number };

export const CARPETA_EFECTOS = 'efectos';
export const rutaEfecto = (e: Efecto) => `${CARPETA_EFECTOS}/${e}.wav`;
/** Mientras habla la voz los efectos bajan, igual que la música. */
const BAJO_LA_VOZ = 0.55;

export function volumenEfecto(linea: Linea, frame: number, base: number): number {
  return fraseActiva(linea, frame) ? base * BAJO_LA_VOZ : base;
}

function escena(linea: Linea, id: string): TramoEscena {
  const e = linea.escenas.find((x) => x.id === id);
  if (!e) throw new Error(`Falta la escena ${id}`);
  return e;
}

/** Los efectos de la historia, ordenados por cuadro. */
export function efectosDeHistoria(linea: Linea): Disparo[] {
  const golpe = (id: string) => golpesDeHistoria(linea).find((g) => g.id === id)!.frame;
  const solucion = escena(linea, 'solucion');
  const resultado = escena(linea, 'resultado');
  const disparos: Disparo[] = [
    // El whoosh llega a su punto más alto justo en el corte.
    ...linea.escenas.slice(1).map((e) => ({ efecto: 'whoosh' as const, frame: e.desde - 10, volumen: 0.45 })),
    { efecto: 'crujido', frame: golpe('grieta') - 2, volumen: 0.6 },
    { efecto: 'pop', frame: golpe('brote') - 3, volumen: 0.6 },
    // Don Julio envía el reporte; el jefe lo activa.
    { efecto: 'clic', frame: momentoDe(solucion, 'h7', 0.35), volumen: 0.5 },
    { efecto: 'clic', frame: momentoDe(solucion, 'h9', 0.2) - 4, volumen: 0.5 },
    { efecto: 'ding', frame: golpe('mapa') + 2, volumen: 0.4 },
    { efecto: 'crujido', frame: momentoDe(solucion, 'h10', fraccionesH10.cae) - 10, volumen: 0.55 },
    { efecto: 'sello', frame: golpe('sello') - 1, volumen: 0.7 },
    // Los checks sobre el campus: tres dings suaves.
    ...[0, 2, 4].map((i) => ({ efecto: 'ding' as const, frame: momentoDe(resultado, 'h11', 0.2 + i * 0.1), volumen: 0.18 })),
  ];
  return disparos.map((d) => ({ ...d, volumen: volumenEfecto(linea, d.frame, d.volumen) })).sort((a, b) => a.frame - b.frame);
}
