import React from 'react';
import { COLOR } from '../tema';

const TAMANO_INICIAL = 24;
const TAMANO_FINAL = 180;

/** Onda que nace donde Hespo pulsa: `progreso` va de 0 a 1 y al final desaparece. */
export const Pulso: React.FC<{ x: number; y: number; progreso: number }> = ({ x, y, progreso }) => {
  if (progreso <= 0 || progreso >= 1) return null;
  const tamano = TAMANO_INICIAL + (TAMANO_FINAL - TAMANO_INICIAL) * progreso;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - tamano / 2,
        top: y - tamano / 2,
        width: tamano,
        height: tamano,
        boxSizing: 'border-box',
        borderRadius: '50%',
        border: `10px solid ${COLOR.hoja}`,
        opacity: 1 - progreso,
      }}
    />
  );
};
