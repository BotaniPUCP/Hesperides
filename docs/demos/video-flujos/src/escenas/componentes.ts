import type React from 'react';
import type { EscenaId } from '../guion';
import type { TramoEscena } from '../tiempos';
import type { PropsEscena } from './tipos';

/** Lo que distingue a un video de otro: sus escenas, el tamaño de Hespo en cada una y dónde está su voz. */
export type ConfigVideo = {
  escenas: Partial<Record<EscenaId, React.FC<PropsEscena>>>;
  /** La escala que falta vale 1. */
  escalas: Partial<Record<EscenaId, number>>;
  /** Carpeta de `public/` con los audios y el manifiesto. */
  carpetaVoz: string;
  /** Cómo se dibuja Hespo; si falta, en 2D. */
  hespo?: '2d' | '3d' | 'semilla';
  /** Música de fondo en `public/`; baja de volumen mientras habla la voz. */
  musica?: string;
  /** Envuelve la escena y a Hespo (no los subtítulos): cámara, sacudidas, partículas. */
  capaEscena?: React.FC<{ frame: number; escena: TramoEscena; children: React.ReactNode }>;
  /** Reloj de la animación de la escena y de Hespo (p. ej. pausas de impacto); la voz no cambia. */
  retiempo?: (frame: number) => number;
  /**
   * Si está, dibuja las escenas en vez del fundido simple (p. ej. una TransitionSeries): recibe
   * cómo dibujar una escena en un cuadro absoluto.
   */
  serie?: (dibujar: (escena: TramoEscena, frame: number) => React.ReactNode) => React.ReactNode;
};

export function componenteDeEscena(config: ConfigVideo, id: EscenaId): React.FC<PropsEscena> {
  const componente = config.escenas[id];
  if (!componente) throw new Error(`La escena ${id} no tiene componente`);
  return componente;
}
