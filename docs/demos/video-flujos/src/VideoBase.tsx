import React from 'react';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { iris } from '@remotion/transitions/iris';
import { wipe } from '@remotion/transitions/wipe';
import { AbsoluteFill, Easing, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { tramosDeSerie, type Corte } from './queEs/serie';
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

// Las presentaciones tienen props distintas; la serie solo necesita que sean presentaciones.
const presentacion = (corte: Corte): TransitionPresentation<Record<string, unknown>> =>
  (corte.tipo === 'cortina' ? wipe({ direction: 'from-left' }) : corte.tipo === 'iris' ? iris({ width: 1920, height: 1080 }) : fade()) as unknown as TransitionPresentation<Record<string, unknown>>;

/** Una escena dentro de la serie: su cuadro es el del video (la serie cuenta desde su inicio). */
const EscenaEnSerie: React.FC<{ escena: TramoEscena; desde: number; config: ConfigVideo; boca: FormaBoca }> = ({ escena, desde, config, boca }) => {
  // useCurrentFrame aquí, en el componente más chico: dentro de la serie el cuadro es relativo.
  const frame = useCurrentFrame() + desde;
  const Escena = componenteDeEscena(config, escena.id);
  return (
    <AbsoluteFill>
      <Escena escena={escena} frame={frame} />
      {config.hespo === 'semilla' ? (
        <SemillaEnVideo escena={escena} frame={config.aDos ? Math.floor(frame / 2) * 2 : frame} boca={boca} escala={config.escalas[escena.id] ?? 1} />
      ) : null}
    </AbsoluteFill>
  );
};

/** Las escenas encadenadas con @remotion/transitions: cada corte con su presentación. */
const EscenasEnSerie: React.FC<{ linea: Linea; config: ConfigVideo & { transiciones: NonNullable<ConfigVideo['transiciones']> }; boca: FormaBoca; total: number }> = ({
  linea,
  config,
  boca,
  total,
}) => {
  const t = config.transiciones;
  const tramos = tramosDeSerie(linea, total, t.cuadros);
  return (
    <TransitionSeries>
      {linea.escenas.flatMap((escena, i) => {
        const piezas = [
          <TransitionSeries.Sequence key={escena.id} durationInFrames={tramos[i].duracion}>
            <EscenaEnSerie escena={escena} desde={tramos[i].desde} config={config} boca={boca} />
          </TransitionSeries.Sequence>,
        ];
        const siguiente = linea.escenas[i + 1];
        if (siguiente) {
          piezas.push(
            <TransitionSeries.Transition
              key={`${escena.id}>${siguiente.id}`}
              presentation={presentacion(t.corte(escena.id, siguiente.id))}
              timing={linearTiming({ durationInFrames: t.cuadros, easing: Easing.bezier(0.45, 0, 0.55, 1) })}
            />,
          );
        }
        return piezas;
      })}
    </TransitionSeries>
  );
};

/** Escenas, Hespo, subtítulos y voz de cualquier video, según su configuración. */
export const VideoBase: React.FC<{ linea: Linea; config: ConfigVideo }> = ({ linea, config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
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
      {config.transiciones ? (
        <EscenasEnSerie linea={linea} config={{ ...config, transiciones: config.transiciones }} boca={boca} total={durationInFrames} />
      ) : (
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
      )}
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
