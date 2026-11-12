import React from 'react';
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Cierre } from './escenas/Cierre';
import { Ejemplares } from './escenas/Ejemplares';
import { Especies } from './escenas/Especies';
import { Incidencias } from './escenas/Incidencias';
import { Inicio } from './escenas/Inicio';
import type { PropsEscena } from './escenas/tipos';
import type { EscenaId } from './guion';
import { Hespo } from './hespo/Hespo';
import { estadoHespo } from './hespo/recorrido';
import { useApertura } from './hespo/useApertura';
import { fraseActiva, FRAMES_TRANSICION, type Linea, type TramoEscena } from './tiempos';
import { indiceFrase } from './ui/anim';
import { Escenario } from './ui/Escenario';
import { fontFamily } from './ui/fuente';
import { Subtitulos } from './ui/Subtitulos';

export type PropsVideo = { linea: Linea | null };

const ESCENAS: Record<EscenaId, React.FC<PropsEscena>> = {
  inicio: Inicio,
  especies: Especies,
  ejemplares: Ejemplares,
  incidencias: Incidencias,
  cierre: Cierre,
};

/** Más pequeño sobre la página: debe caber delante de sus elementos sin taparlos. */
const ESCALA_HESPO: Record<EscenaId, number> = { inicio: 1, especies: 0.6, ejemplares: 0.6, incidencias: 0.6, cierre: 1 };

function escenaEn(linea: Linea, frame: number): TramoEscena {
  const actual = linea.escenas.find((e) => frame < e.desde + e.frames + FRAMES_TRANSICION);
  return actual ?? linea.escenas[linea.escenas.length - 1];
}

const Contenido: React.FC<{ linea: Linea }> = ({ linea }) => {
  const frame = useCurrentFrame();
  const escena = escenaEn(linea, frame);
  const fin = escena.desde + escena.frames;
  const tramo = fraseActiva(linea, frame);
  const apertura = useApertura(tramo?.archivo ?? null, tramo ? frame - tramo.desde : 0);
  const Escena = ESCENAS[escena.id];

  // Escena y Hespo se desvanecen juntos: así el salto de Hespo a la siguiente entrada no se ve.
  const opacidad = interpolate(frame, [fin, fin + FRAMES_TRANSICION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ultima = escena.frases[indiceFrase(escena, frame)];
  const subtitulo = frame < fin ? ultima?.frase.texto ?? null : null;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Escenario />
      <AbsoluteFill style={{ opacity: opacidad }}>
        <Escena escena={escena} frame={frame} />
        <Hespo estado={estadoHespo(escena, frame)} frame={frame} apertura={apertura} escala={ESCALA_HESPO[escena.id]} />
      </AbsoluteFill>
      <Subtitulos texto={subtitulo} />
      {linea.escenas
        .flatMap((e) => e.frases)
        .map((t) => (
          <Sequence key={t.frase.id} from={t.desde} durationInFrames={t.frames} layout="none">
            <Html5Audio src={staticFile(`voz/${t.archivo}`)} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const Video: React.FC<PropsVideo> = ({ linea }) => (linea ? <Contenido linea={linea} /> : null);
