// Composición de revisión: los personajes de la historia en distintos gestos.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLOR } from '../tema';
import { Persona } from './Persona';

export const PruebaPersonas: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLOR.barriga }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, bottom: 0, background: COLOR.arena }} />
      <Persona quien="julio" x={260} sueloY={860} escala={1.3} frame={frame} pose={{ brazoI: 8, brazoD: 30 }} gesto="neutral" />
      <Persona quien="julio" x={620} sueloY={860} escala={1.3} frame={frame} pose={{ brazoI: 10, brazoD: 120, miraY: -0.6 }} gesto="preocupado" objeto="celular" />
      <Persona quien="jefe" x={980} sueloY={860} escala={1.3} frame={frame} pose={{ brazoI: 8, brazoD: 150, inclina: 4 }} gesto="pensativo" />
      <Persona quien="jefe" x={1300} sueloY={860} escala={1.3} frame={frame} pose={{ brazoI: 60, brazoD: 60 }} gesto="feliz" sentado />
      <Persona quien="podador" x={1680} sueloY={860} escala={1.3} frame={frame} pose={{ brazoI: 20, brazoD: 100 }} gesto="sorpresa" objeto="podadora" />
    </AbsoluteFill>
  );
};
