// PRUEBA DESECHABLE (spike): los cuatro rediseños en movimiento y en una hoja de expresiones.
import React from 'react';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR } from '../../tema';
import { fontFamily } from '../../ui/fuente';
import { formaDesdeEspectro, suavizar, type FormaBoca } from '../boca';
import { altura, caminata, INICIO_VOZ, type Emocion } from '../coreografia';
import { simular, type EstadoSim } from '../simulacion';
import { DISENOS, type Diseno } from './disenos';
import { HespoV2 } from './HespoV2';

const VOZ = 'voz/venta/v4.mp3';
const ESCALA_REFERENCIA = 1.15;

function useEspectro(frame: number): number[] | null {
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(VOZ));
  if (!audio) return null;
  const local = frame - INICIO_VOZ;
  if (local < 0 || local >= Math.floor(audio.durationInSeconds * fps)) return null;
  return visualizeAudio({ fps, frame: local, audioData: audio, numberOfSamples: 32 });
}

function useBoca(frame: number): FormaBoca {
  const formas = [useEspectro(frame - 1), useEspectro(frame), useEspectro(frame + 1)].map((m) => (m ? formaDesdeEspectro(m) : { abre: 0, ancho: 0 }));
  return suavizar(formas);
}

const Celda: React.FC<{ d: Diseno; x: number; y: number; ancho: number; alto: number; children: React.ReactNode; titulo?: boolean }> = ({
  d,
  x,
  y,
  ancho,
  alto,
  children,
  titulo = true,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, width: ancho, height: alto, overflow: 'hidden', background: COLOR.verde, outline: `2px solid ${COLOR.borde}` }}>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: alto * 0.2, background: COLOR.arena }} />
    {children}
    {titulo ? (
      <div style={{ position: 'absolute', left: 24, top: 16, color: COLOR.blanco }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>{d.nombre}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.arena }}>{d.idea}</div>
      </div>
    ) : null}
  </div>
);

/** Los cuatro diseños hacen la misma coreografía, con la misma voz. */
export const RedisenosHespo: React.FC<{ disenos?: Diseno[] }> = ({ disenos = DISENOS }) => {
  const frame = useCurrentFrame();
  const boca = useBoca(frame);
  const escala = 0.72;
  const factor = escala / ESCALA_REFERENCIA;
  const s = simular(frame);
  const vh = (altura(frame) - altura(frame - 1)) * 30;
  const animado: EstadoSim = { ...s, h: s.h * factor };
  return (
    <AbsoluteFill style={{ fontFamily, background: COLOR.negro }}>
      {disenos.map((d, i) => {
        const cx = (i % 2) * 960;
        const cy = Math.floor(i / 2) * 540;
        return (
          <Celda key={d.id} d={d} x={cx} y={cy} ancho={960} alto={540}>
            <HespoV2 d={d} s={animado} frame={frame} boca={boca} x={330 + caminata(frame).x * factor} sueloY={540 * 0.86} escala={escala} vh={vh} />
          </Celda>
        );
      })}
      <Sequence from={INICIO_VOZ} layout="none">
        <Html5Audio src={staticFile(VOZ)} />
      </Sequence>
    </AbsoluteFill>
  );
};

const EMOCIONES: Emocion[] = ['neutral', 'feliz', 'sorpresa', 'pensativo', 'triste'];
const NOMBRES: Record<Emocion, string> = { neutral: 'Neutral', feliz: 'Feliz', sorpresa: 'Sorpresa', pensativo: 'Pensativo', triste: 'Triste' };

/** Una pose quieta para cada emoción: lo que una hoja de modelo muestra de un personaje. */
function pose(emocion: Emocion): EstadoSim {
  const brazos: Record<Emocion, [number, number]> = { neutral: [10, 10], feliz: [40, 150], sorpresa: [70, 70], pensativo: [8, 135], triste: [2, 2] };
  return {
    x: 0,
    h: 0,
    brazoI: brazos[emocion][0],
    brazoD: brazos[emocion][1],
    inclina: emocion === 'triste' ? -4 : emocion === 'pensativo' ? 5 : 0,
    miradaX: emocion === 'pensativo' ? 0.6 : 0,
    miradaY: emocion === 'pensativo' ? -0.4 : emocion === 'triste' ? 0.4 : 0,
    agachado: emocion === 'triste' ? 0.3 : 0,
    deforma: emocion === 'sorpresa' ? 0.06 : emocion === 'triste' ? -0.05 : 0,
    hojaI: 0,
    hojaD: 0,
    fase: 0,
    w: 0,
    ojos: 'abiertos',
    mano: 'abierta',
    temblor: 0,
    velBrazoD: 0,
    emocion,
  };
}

/** Hoja de expresiones: cada diseño (fila) en cada emoción (columna). */
export const HojaDeExpresiones: React.FC<{ disenos?: Diseno[] }> = ({ disenos = DISENOS }) => {
  const ancho = 1920 / 6;
  const alto = (1080 - 60) / 4;
  return (
    <AbsoluteFill style={{ fontFamily, background: COLOR.negro }}>
      {EMOCIONES.map((e, j) => (
        <div key={e} style={{ position: 'absolute', left: ancho * (j + 1), top: 0, width: ancho, height: 60, color: COLOR.blanco, fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {NOMBRES[e]}
        </div>
      ))}
      {disenos.map((d, i) => (
        <React.Fragment key={d.id}>
          <div style={{ position: 'absolute', left: 0, top: 60 + alto * i, width: ancho, height: alto, color: COLOR.blanco, padding: 20, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{d.nombre}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLOR.arena }}>{d.idea}</div>
          </div>
          {EMOCIONES.map((e, j) => (
            <Celda key={e} d={d} x={ancho * (j + 1)} y={60 + alto * i} ancho={ancho} alto={alto} titulo={false}>
              <HespoV2 d={d} s={pose(e)} frame={40} boca={{ abre: 0, ancho: 0 }} x={ancho / 2} sueloY={alto * 0.9} escala={0.46} vh={0} />
            </Celda>
          ))}
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

/** Retratos grandes: cada diseño de cuerpo entero, para ver el detalle. */
export const Retratos: React.FC<{ disenos?: Diseno[] }> = ({ disenos = DISENOS }) => {
  const ancho = 1920 / disenos.length;
  const saluda: EstadoSim = { ...pose('feliz'), brazoI: 14, brazoD: 140 };
  return (
    <AbsoluteFill style={{ fontFamily, background: COLOR.verde }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: COLOR.arena }} />
      {disenos.map((d, i) => (
        <React.Fragment key={d.id}>
          <HespoV2 d={d} s={i % 2 ? pose('neutral') : saluda} frame={40} boca={{ abre: 0, ancho: 0 }} x={ancho * i + ancho / 2} sueloY={860} escala={1.25} vh={0} />
          <div style={{ position: 'absolute', left: ancho * i, width: ancho, top: 905, textAlign: 'center', color: COLOR.borde }}>
            <div style={{ fontSize: 46, fontWeight: 800 }}>{d.nombre}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{d.idea}</div>
          </div>
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};
