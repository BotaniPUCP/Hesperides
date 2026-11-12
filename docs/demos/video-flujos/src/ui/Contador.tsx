import React from 'react';

export const Contador: React.FC<{ valor: number; progreso: number; tamano?: number }> = ({ valor, progreso, tamano = 96 }) => (
  <span style={{ fontSize: tamano, fontWeight: 800, lineHeight: 1 }}>{Math.round(valor * progreso)}</span>
);
