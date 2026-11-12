import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ALTO, BANDA, COLOR, SUELO_TOP } from '../tema';

/** Fondo de todo el video: verde dominante, suelo arena y banda de subtítulos. */
export const Escenario: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.verde }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: SUELO_TOP, height: ALTO - SUELO_TOP - BANDA, backgroundColor: COLOR.arena }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BANDA, backgroundColor: COLOR.negro }} />
  </AbsoluteFill>
);
