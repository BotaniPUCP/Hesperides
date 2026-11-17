// Hespo Semilla manejado por el guion: el recorrido de cada frase es la meta de los resortes.
import { spring } from 'remotion';
import { POSES_HESPO } from '../hespo/poses';
import { estadoHespo, llegadaDe, sueloDe } from '../hespo/recorrido';
import { FPS, type TramoEscena } from '../tiempos';
import { indiceFrase } from '../ui/anim';
import { PASO_MEDIO } from './coreografia';
import { integrar, type EstadoSim, type Meta } from './simulacion';

/** Cuadros que espera Hespo antes de brotar en una escena (el suelo tiembla primero). */
export const ESPERA_BROTE = 10;

/** En la historia Hespo no entra caminando: brota en el lugar de su primera frase. */
function brotaEnSuLugar(escena: TramoEscena): boolean {
  return escena.frases[0].frase.hespo.x > 0;
}

function metaEn(escena: TramoEscena, f: number): Meta {
  const e = estadoHespo(escena, f);
  const primera = escena.frases[0].frase;
  const antesDeLlegar = brotaEnSuLugar(escena) && f < llegadaDe(escena, primera.id, 0);
  const tramo = escena.frases[Math.max(0, indiceFrase(escena, f))].frase;
  const a = antesDeLlegar ? POSES_HESPO[primera.hespo.pose] : e.articulaciones;
  const x = antesDeLlegar ? primera.hespo.x : e.x;
  const caminando = !antesDeLlegar && e.caminando;
  // Brote: un saltito al aparecer.
  const t = f - escena.desde - ESPERA_BROTE;
  const salto = brotaEnSuLugar(escena) && t >= 0 && t < 16 ? 70 * Math.sin((Math.PI * t) / 16) : 0;
  return {
    x,
    h: Math.max(0, sueloDe(escena.id) - e.y - a.saltoY) + salto,
    brazoI: a.brazoI,
    brazoD: -a.brazoD,
    inclina: a.inclina,
    miradaX: a.mirada / 10,
    miradaY: 0,
    agachado: 0,
    fase: x / (4 * PASO_MEDIO),
    w: caminando ? 1 : 0,
    ojos: 'abiertos',
    mano: e.pose === 'pulgar' ? 'pulgar' : 'abierta',
    emocion: tramo.hespo.emocion ?? 'neutral',
  };
}

export type SemillaEnEscena = { s: EstadoSim; vh: number; tamano: number } | null;

/** Estado del Hespo Semilla en un cuadro, o null si todavía no brota. */
export function semillaEnEscena(escena: TramoEscena, frame: number): SemillaEnEscena {
  const desde = escena.desde;
  const t = frame - desde - ESPERA_BROTE;
  if (brotaEnSuLugar(escena) && t < 0) return null;
  if (!brotaEnSuLugar(escena) && escena.frases.every((f) => f.frase.hespo.x < 0)) return null;
  const s = integrar((f) => metaEn(escena, f), desde, frame);
  const vh = (metaEn(escena, frame).h - metaEn(escena, Math.max(desde, frame - 1)).h) * 30;
  const tamano = brotaEnSuLugar(escena) ? spring({ frame: t, fps: FPS, config: { damping: 9, stiffness: 160 } }) : 1;
  return { s, vh, tamano };
}
