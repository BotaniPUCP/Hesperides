// Marcas a mano sobre las capturas reales (caja o círculo de @remotion/rough-notation), con el
// avance llevado por el cuadro. La semilla nunca es 0: con 0 la librería usaría Math.random.
import React from 'react';
import { Box, Circle } from '@remotion/rough-notation';
import { COLOR } from '../tema';

export const MarcaAMano: React.FC<{
  tipo: 'caja' | 'circulo';
  x: number;
  y: number;
  ancho: number;
  alto: number;
  progreso: number;
  semilla: number;
  color?: string;
}> = ({ tipo, x, y, ancho, alto, progreso, semilla, color = COLOR.verde }) => {
  if (progreso <= 0) return null;
  const dentro = <div style={{ width: ancho, height: alto }} />;
  const comun = { progress: progreso, seed: Math.max(1, semilla), color, strokeWidth: 5, roughness: 1.2, bowing: 1 };
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho, height: alto, pointerEvents: 'none' }}>
      {tipo === 'caja' ? (
        <Box {...comun} padding={{ left: 12, right: 12, top: 10, bottom: 10 }} iterations={2}>
          {dentro}
        </Box>
      ) : (
        <Circle {...comun} padding={{ left: 14, right: 14, top: 10, bottom: 10 }} iterations={2}>
          {dentro}
        </Circle>
      )}
    </div>
  );
};
