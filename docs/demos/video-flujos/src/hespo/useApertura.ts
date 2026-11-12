import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { staticFile, useVideoConfig } from 'remotion';
import { aperturaDesdeEspectro } from './boca';

const MUESTRAS = 16;
const AUDIO_DE_RESERVA = 'i1.mp3';

/**
 * Cuánto se abre la boca en este fotograma, de 0 a 1. El hook no puede omitirse
 * en los silencios, así que entonces lee un audio de reserva de `carpeta` y devuelve 0.
 */
export function useApertura(carpeta: string, archivo: string | null, frameLocal: number): number {
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(`${carpeta}/${archivo ?? AUDIO_DE_RESERVA}`));
  if (!archivo || !audio) return 0;
  return aperturaDesdeEspectro(visualizeAudio({ fps, frame: frameLocal, audioData: audio, numberOfSamples: MUESTRAS }));
}
