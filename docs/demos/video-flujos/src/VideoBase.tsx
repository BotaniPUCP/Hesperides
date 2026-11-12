import React from 'react';
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { componenteDeEscena, type ConfigVideo } from './escenas/componentes';
import { Hespo } from './hespo/Hespo';
import { estadoHespo } from './hespo/recorrido';
import { useApertura } from './hespo/useApertura';
import { fraseActiva, FRAMES_TRANSICION, type Linea, type TramoEscena } from './tiempos';
import { indiceFrase } from './ui/anim';
import { Escenario } from './ui/Escenario';
import { fontFamily } from './ui/fuente';
import { Subtitulos } from './ui/Subtitulos';

function escenaEn(linea: Linea, frame: number): TramoEscena {
  const actual = linea.escenas.find((e) => frame < e.desde + e.frames + FRAMES_TRANSICION);
  return actual ?? linea.escenas[linea.escenas.length - 1];
}

/** Escenas, Hespo, subtítulos y voz de cualquier video, según su configuración. */
export const VideoBase: React.FC<{ linea: Linea; config: ConfigVideo }> = ({ linea, config }) => {
  const frame = useCurrentFrame();
  const escena = escenaEn(linea, frame);
  const fin = escena.desde + escena.frames;
  const tramo = fraseActiva(linea, frame);
  const audio = (archivo: string) => `${config.carpetaVoz}/${archivo}`;
  const apertura = useApertura(config.carpetaVoz, tramo?.archivo ?? null, tramo ? frame - tramo.desde : 0);
  const Escena = componenteDeEscena(config, escena.id);

  // Escena y Hespo se desvanecen juntos: así el salto de Hespo a la siguiente entrada no se ve.
  const opacidad = interpolate(frame, [fin, fin + FRAMES_TRANSICION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ultima = escena.frases[indiceFrase(escena, frame)];
  const subtitulo = frame < fin ? ultima?.frase.texto ?? null : null;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Escenario />
      <AbsoluteFill style={{ opacity: opacidad }}>
        <Escena escena={escena} frame={frame} />
        <Hespo estado={estadoHespo(escena, frame)} frame={frame} apertura={apertura} escala={config.escalas[escena.id] ?? 1} />
      </AbsoluteFill>
      <Subtitulos texto={subtitulo} />
      {linea.escenas
        .flatMap((e) => e.frases)
        .map((t) => (
          <Sequence key={t.frase.id} from={t.desde} durationInFrames={t.frames} layout="none">
            <Html5Audio src={staticFile(audio(t.archivo))} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
