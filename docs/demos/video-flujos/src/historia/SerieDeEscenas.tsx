// Las escenas de la historia en una TransitionSeries (@remotion/transitions), con destellos de luz
// cálida (@remotion/light-leaks) sobre algunos cortes. Nada se mueve de lado: fundido, cortinilla
// vertical o iris.
import React from 'react';
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from 'remotion';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { iris } from '@remotion/transitions/iris';
import { wipe } from '@remotion/transitions/wipe';
import { ALTO, BANDA, ANCHO } from '../tema';
import type { Linea, TramoEscena } from '../tiempos';
import { CORTES_HISTORIA, secuenciasConTransicion, type TipoCorte } from './transiciones';

type Dibujar = (escena: TramoEscena, frame: number) => React.ReactNode;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentacion = (tipo: TipoCorte): TransitionPresentation<any> =>
  tipo === 'iris' ? iris({ width: ANCHO, height: ALTO - BANDA }) : tipo === 'wipe' ? wipe({ direction: 'from-top' }) : fade();

/** El cuadro local de la secuencia más su inicio: las escenas trabajan con el cuadro absoluto. */
const EscenaEnSerie: React.FC<{ escena: TramoEscena; desde: number; dibujar: Dibujar }> = ({ escena, desde, dibujar }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill>{dibujar(escena, frame + desde)}</AbsoluteFill>;
};

/** Duración del destello de luz, centrado en el corte. */
const DURACION_LUZ = 30;

export const SerieDeEscenas: React.FC<{ linea: Linea; total: number; transicion: number; dibujar: Dibujar }> = ({ linea, total, transicion, dibujar }) => {
  const secuencias = secuenciasConTransicion(linea, total, transicion);
  const timing = linearTiming({ durationInFrames: transicion, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  return (
    <>
      <TransitionSeries>
        {secuencias.flatMap((s, i) => [
          ...(i > 0 ? [<TransitionSeries.Transition key={`t${i}`} presentation={presentacion(CORTES_HISTORIA[i - 1].tipo)} timing={timing} />] : []),
          <TransitionSeries.Sequence key={s.escena.id} durationInFrames={s.duracion}>
            <EscenaEnSerie escena={s.escena} desde={s.desde} dibujar={dibujar} />
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
      {secuencias.slice(1).map((s, i) =>
        CORTES_HISTORIA[i].luz ? (
          <Sequence key={`luz${i}`} from={s.desde + transicion / 2 - DURACION_LUZ / 2} durationInFrames={DURACION_LUZ} layout="none">
            {/* Solo sobre la imagen, nunca sobre la banda de subtítulos; tenue, para no lavar el color. */}
            <AbsoluteFill style={{ height: ALTO - BANDA, overflow: 'hidden', mixBlendMode: 'screen', opacity: 0.35, pointerEvents: 'none' }}>
              <LightLeak seed={i + 3} hueShift={20} width={ANCHO} height={ALTO - BANDA} />
            </AbsoluteFill>
          </Sequence>
        ) : null,
      )}
    </>
  );
};
