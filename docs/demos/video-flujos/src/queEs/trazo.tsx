// Trazos a mano sobre las pantallas reales, con @remotion/rough-notation: el avance lo da el cuadro.
import { Box, Circle, Underline } from '@remotion/rough-notation';
import React from 'react';

export const ROJO_TRAZO = '#E5483B';

/**
 * Círculo, caja o subrayado alrededor de una caja medida sobre la captura; `progreso` 0..1 lo
 * dibuja. La semilla fija el temblor del trazo: es el mismo en cada render.
 */
export const Trazo: React.FC<{
  tipo: 'circulo' | 'caja' | 'subrayado';
  x: number;
  y: number;
  ancho: number;
  alto: number;
  progreso: number;
  semilla?: number;
  color?: string;
  grosor?: number;
}> = ({ tipo, x, y, ancho, alto, progreso, semilla = 7, color = ROJO_TRAZO, grosor = 5 }) => {
  if (progreso <= 0) return null;
  const hueco = <div style={{ width: ancho, height: alto }} />;
  const comun = { progress: Math.min(1, progreso), seed: semilla, color, strokeWidth: grosor, roughness: 1.4 };
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho, height: alto }}>
      {tipo === 'circulo' ? (
        <Circle {...comun} padding={{ left: 16, right: 16, top: 14, bottom: 14 }}>
          {hueco}
        </Circle>
      ) : tipo === 'caja' ? (
        <Box {...comun} padding={{ left: 8, right: 8, top: 6, bottom: 6 }}>
          {hueco}
        </Box>
      ) : (
        <Underline {...comun} padding={{ top: 4 }}>
          {hueco}
        </Underline>
      )}
    </div>
  );
};
