import React from 'react';
import { COLOR } from '../tema';

const lienzo = (tamano: number) => ({ width: tamano, height: tamano, viewBox: '0 0 64 64' });
const trazo = { fill: 'none', stroke: COLOR.verde, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconoHoja: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <path d="M12 52 C12 24 30 12 54 10 C54 36 40 52 12 52 Z" {...trazo} />
    <path d="M12 52 C22 40 32 30 42 24" {...trazo} />
  </svg>
);

export const IconoPlanta: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <circle cx="32" cy="22" r="16" {...trazo} />
    <path d="M32 38 L32 56 M22 56 L42 56" {...trazo} />
  </svg>
);

export const IconoAviso: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <path d="M32 8 L58 54 L6 54 Z" {...trazo} />
    <path d="M32 26 L32 40 M32 47 L32 47" {...trazo} />
  </svg>
);
