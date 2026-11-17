import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { staticFile, useVideoConfig } from 'remotion';
import { formaDesdeEspectro, suavizar, type FormaBoca } from './boca';

/**
 * Forma de la boca (cuánto se abre y si es ancha o redonda) según la voz, promediando tres
 * cuadros. En los silencios lee `reserva` (el hook no puede omitirse) y devuelve la boca cerrada.
 */
export function useFormaBoca(carpeta: string, archivo: string | null, frameLocal: number, reserva: string): FormaBoca {
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(`${carpeta}/${archivo ?? reserva}`));
  if (!archivo || !audio) return { abre: 0, ancho: 0 };
  const total = Math.floor(audio.durationInSeconds * fps);
  const formas = [frameLocal - 1, frameLocal, frameLocal + 1].map((f) =>
    f < 0 || f >= total ? { abre: 0, ancho: 0 } : formaDesdeEspectro(visualizeAudio({ fps, frame: f, audioData: audio, numberOfSamples: 32 })),
  );
  return suavizar(formas);
}
