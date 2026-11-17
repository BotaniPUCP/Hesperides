// PRUEBA DESECHABLE (spike): Hespo 3D actual frente al Hespo 2D animado, misma coreografía y voz.
import React from 'react';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { aperturaDesdeEspectro } from '../hespo/boca';
import { POSES_HESPO } from '../hespo/poses';
import type { EstadoHespo } from '../hespo/recorrido';
import { HespoEnEscena3D } from '../hespo3d/HespoEnEscena3D';
import { COLOR, SUELO_Y } from '../tema';
import { Escenario } from '../ui/Escenario';
import { fontFamily } from '../ui/fuente';
import { formaDesdeEspectro, suavizar, type FormaBoca } from './boca';
import { altura, caminata, INICIO_VOZ, objetivo } from './coreografia';
import { Hespo2D } from './Hespo2D';
import { simular } from './simulacion';

const VOZ = 'voz/venta/v4.mp3';
const TEXTO = '¡Hola! Soy Hespo. Y para eso existe Hesperides.';

function useEspectro(frame: number, muestras: number): number[] | null {
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(VOZ));
  if (!audio) return null;
  const local = frame - INICIO_VOZ;
  if (local < 0 || local >= Math.floor(audio.durationInSeconds * fps)) return null;
  return visualizeAudio({ fps, frame: local, audioData: audio, numberOfSamples: muestras });
}

function useBoca2D(frame: number): FormaBoca {
  const formas = [useEspectro(frame - 1, 32), useEspectro(frame, 32), useEspectro(frame + 1, 32)].map((m) =>
    m ? formaDesdeEspectro(m) : { abre: 0, ancho: 0 },
  );
  return suavizar(formas);
}

/** El 3D como funciona hoy: sigue la coreografía directo, sin resortes ni deformación. */
function estado3D(frame: number, x0: number): EstadoHespo {
  const o = objetivo(frame);
  return {
    x: x0 + caminata(frame).x,
    y: SUELO_Y - altura(frame),
    mira: 1,
    caminando: false,
    pose: 'quieto',
    articulaciones: { ...POSES_HESPO.quieto, brazoI: o.brazoI, brazoD: -o.brazoD, inclina: o.inclina, mirada: o.miradaX * 8 },
  };
}

const Etiqueta: React.FC<{ x: number; texto: string; sub: string }> = ({ x, texto, sub }) => (
  <div style={{ position: 'absolute', left: x, width: 960, top: 40, textAlign: 'center', color: COLOR.blanco }}>
    <div style={{ fontSize: 54, fontWeight: 800 }}>{texto}</div>
    <div style={{ fontSize: 30, fontWeight: 700, color: COLOR.arena }}>{sub}</div>
  </div>
);

const Subtitulo: React.FC<{ frame: number }> = ({ frame }) =>
  frame >= INICIO_VOZ && frame < INICIO_VOZ + 165 ? (
    <div style={{ position: 'absolute', bottom: 0, height: 140, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.blanco, fontSize: 50, fontWeight: 700 }}>
      {TEXTO}
    </div>
  ) : null;

const Voz: React.FC = () => (
  <Sequence from={INICIO_VOZ} layout="none">
    <Html5Audio src={staticFile(VOZ)} />
  </Sequence>
);

export const ComparacionHespo: React.FC = () => {
  const frame = useCurrentFrame();
  const espectro3D = useEspectro(frame, 16);
  const boca = useBoca2D(frame);
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Escenario />
      <Etiqueta x={0} texto="Actual" sub="3D, de pose a pose" />
      <Etiqueta x={960} texto="Propuesta" sub="2D con principios de animación" />
      <div style={{ position: 'absolute', left: 958, top: 0, width: 4, height: 940, background: COLOR.arena, opacity: 0.6 }} />
      <HespoEnEscena3D estado={estado3D(frame, 370)} frame={frame} apertura={espectro3D ? aperturaDesdeEspectro(espectro3D) : 0} escala={1.15} />
      <Hespo2D s={simular(frame)} frame={frame} boca={boca} x={960 + 370} sueloY={SUELO_Y} escala={1.15} />
      <Subtitulo frame={frame} />
      <Voz />
    </AbsoluteFill>
  );
};

export const Hespo2DDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const boca = useBoca2D(frame);
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Escenario />
      <Hespo2D s={simular(frame)} frame={frame} boca={boca} x={760} sueloY={SUELO_Y} escala={1.6} />
      <Subtitulo frame={frame} />
      <Voz />
    </AbsoluteFill>
  );
};
