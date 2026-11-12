import React from 'react';
import { COLOR } from '../tema';

export type PropsTarjeta = {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Progreso de aparición, de 0 a 1. */
  aparicion: number;
  /** Tarjeta de la que se está hablando. */
  destacada?: boolean;
  children: React.ReactNode;
};

const DESPLAZAMIENTO = 24;

export const Tarjeta: React.FC<PropsTarjeta> = ({ x, y, ancho, alto, aparicion, destacada = false, children }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: ancho,
      height: alto,
      boxSizing: 'border-box',
      padding: 32,
      borderRadius: 24,
      backgroundColor: COLOR.blanco,
      color: COLOR.verde,
      opacity: aparicion,
      transform: `translateY(${(1 - aparicion) * DESPLAZAMIENTO}px) scale(${destacada ? 1.04 : 1})`,
      outline: destacada ? `8px solid ${COLOR.hoja}` : 'none',
    }}
  >
    {children}
  </div>
);
