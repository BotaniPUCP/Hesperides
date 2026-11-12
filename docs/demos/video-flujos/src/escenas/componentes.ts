import type React from 'react';
import type { EscenaId } from '../guion';
import type { PropsEscena } from './tipos';

/** Lo que distingue a un video de otro: sus escenas, el tamaño de Hespo en cada una y dónde está su voz. */
export type ConfigVideo = {
  escenas: Partial<Record<EscenaId, React.FC<PropsEscena>>>;
  /** La escala que falta vale 1. */
  escalas: Partial<Record<EscenaId, number>>;
  /** Carpeta de `public/` con los audios y el manifiesto. */
  carpetaVoz: string;
};

export function componenteDeEscena(config: ConfigVideo, id: EscenaId): React.FC<PropsEscena> {
  const componente = config.escenas[id];
  if (!componente) throw new Error(`La escena ${id} no tiene componente`);
  return componente;
}
