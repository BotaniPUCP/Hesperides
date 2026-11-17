import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { componenteDeEscena, type ConfigVideo } from './escenas/componentes';
import { Hespo } from './hespo/Hespo';
import { HespoEnEscena3D } from './hespo3d/HespoEnEscena3D';
import { estadoHespo, sueloDe } from './hespo/recorrido';
import type { FormaBoca } from './hespo2d/boca';
import { semillaEnEscena } from './hespo2d/semillaEnGuion';
import { useFormaBoca } from './hespo2d/useFormaBoca';
import { DISENOS } from './hespo2d/v2/disenos';
import { HespoV2 } from './hespo2d/v2/HespoV2';
import { useApertura } from './hespo/useApertura';
import { fraseActiva, FRAMES_TRANSICION, opacidadDeEscena, volumenMusica, type Linea, type TramoEscena } from './tiempos';
import { indiceFrase } from './ui/anim';
import { Escenario } from './ui/Escenario';
import { fontFamily } from './ui/fuente';
import { Subtitulos } from './ui/Subtitulos';

/** El trazo tiembla apenas, como dibujado a mano (line boil), igual que el grano de la escena. */
const SEMILLA_CON_TRAZO_VIVO = { ...DISENOS[1], trazoAMano: true };

/** Hespo Semilla (diseño elegido el 2026-11-17): brota, camina y gesticula con resortes. */
const SemillaEnVideo: React.FC<{ escena: TramoEscena; frame: number; boca: FormaBoca; escala: number }> = ({ escena, frame, boca, escala }) => {
  const estado = semillaEnEscena(escena, frame);
  if (!estado || estado.tamano <= 0.01) return null;
  return (
    <HespoV2 d={SEMILLA_CON_TRAZO_VIVO} s={estado.s} frame={frame} boca={boca} x={estado.s.x} sueloY={sueloDe(escena.id)} escala={escala * estado.tamano} vh={estado.vh} />
  );
};

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
  const reserva = linea.escenas[0].frases[0].archivo;
  const apertura = useApertura(config.carpetaVoz, tramo?.archivo ?? null, tramo ? frame - tramo.desde : 0, reserva);
  const boca = useFormaBoca(config.carpetaVoz, tramo?.archivo ?? null, tramo ? frame - tramo.desde : 0, reserva);
  const Escena = componenteDeEscena(config, escena.id);

  // Escena y Hespo se desvanecen juntos: así el salto de Hespo a la siguiente entrada no se ve.
  const opacidad = opacidadDeEscena(linea, escena, frame);
  const ultima = escena.frases[indiceFrase(escena, frame)];
  const subtitulo = frame < fin ? ultima?.frase.texto ?? null : null;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Escenario />
      <AbsoluteFill style={{ opacity: opacidad }}>
        <Escena escena={escena} frame={frame} />
        {config.hespo === 'semilla' ? (
          <SemillaEnVideo escena={escena} frame={config.aDos ? Math.floor(frame / 2) * 2 : frame} boca={boca} escala={config.escalas[escena.id] ?? 1} />
        ) : config.hespo === '3d' ? (
          <HespoEnEscena3D estado={estadoHespo(escena, frame)} frame={frame} apertura={apertura} escala={config.escalas[escena.id] ?? 1} />
        ) : (
          <Hespo estado={estadoHespo(escena, frame)} frame={frame} apertura={apertura} escala={config.escalas[escena.id] ?? 1} />
        )}
      </AbsoluteFill>
      <Subtitulos texto={subtitulo} />
      {linea.escenas
        .flatMap((e) => e.frases)
        .map((t) => (
          <Sequence key={t.frase.id} from={t.desde} durationInFrames={t.frames} layout="none">
            <Html5Audio src={staticFile(audio(t.archivo))} />
          </Sequence>
        ))}
      {config.musica ? <Html5Audio src={staticFile(config.musica)} volume={(f) => volumenMusica(linea, f)} /> : null}
    </AbsoluteFill>
  );
};
