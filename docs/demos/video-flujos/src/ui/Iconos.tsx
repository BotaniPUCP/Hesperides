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

/** Frecuencia: cada cuánto. */
export const IconoReloj: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <circle cx="32" cy="34" r="22" {...trazo} />
    <path d="M32 22 L32 34 L42 40 M24 6 L40 6" {...trazo} />
  </svg>
);

/** Conjunto: varios jardines agrupados. */
export const IconoConjunto: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <rect x="6" y="6" width="52" height="52" rx="10" {...trazo} />
    <circle cx="22" cy="24" r="7" {...trazo} />
    <circle cx="42" cy="24" r="7" {...trazo} />
    <circle cx="32" cy="42" r="7" {...trazo} />
  </svg>
);

/** Planificación: lo que toca, en orden. */
export const IconoLista: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <path d="M8 14 L13 19 L21 9 M8 32 L13 37 L21 27 M8 50 L13 55 L21 45" {...trazo} />
    <path d="M30 14 L56 14 M30 32 L56 32 M30 50 L56 50" {...trazo} />
  </svg>
);

/** Reserva: un día del calendario. */
export const IconoCalendario: React.FC<{ tamano?: number }> = ({ tamano = 72 }) => (
  <svg {...lienzo(tamano)}>
    <rect x="8" y="12" width="48" height="44" rx="6" {...trazo} />
    <path d="M8 26 L56 26 M20 6 L20 16 M44 6 L44 16 M22 40 L30 46 L42 34" {...trazo} />
  </svg>
);
