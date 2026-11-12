import React from 'react';
import { COLOR } from '../tema';
import type { Medida } from './medidas';

const MARGEN = 8;

/** Marca sobre la captura el dato del que se está hablando. */
export const Resalte: React.FC<{ medida: Medida; visible: number }> = ({ medida, visible }) => (
  <div
    style={{
      position: 'absolute',
      left: medida.x - MARGEN,
      top: medida.y - MARGEN,
      width: medida.ancho + MARGEN * 2,
      height: medida.alto + MARGEN * 2,
      boxSizing: 'border-box',
      borderRadius: 12,
      border: `5px solid ${COLOR.verde}`,
      backgroundColor: 'rgba(111, 191, 135, 0.28)',
      opacity: visible,
    }}
  />
);
