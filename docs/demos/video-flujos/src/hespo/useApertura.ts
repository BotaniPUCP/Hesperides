import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { staticFile, useVideoConfig } from 'remotion';
import { aperturaDesdeEspectro } from './boca';

const MUESTRAS = 16;

/**
 * Cuánto se abre la boca en este fotograma, de 0 a 1. El hook no puede omitirse
 * en los silencios, así que entonces lee `reserva` (un audio que existe en `carpeta`) y devuelve 0.
 */
export function useApertura(carpeta: string, archivo: string | null, frameLocal: number, reserva: string): number {
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(`${carpeta}/${archivo ?? reserva}`));
  if (!archivo || !audio) return 0;
  return aperturaDesdeEspectro(visualizeAudio({ fps, frame: frameLocal, audioData: audio, numberOfSamples: MUESTRAS }));
}
