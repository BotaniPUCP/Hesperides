import React from 'react';
import { Img, staticFile } from 'remotion';
import { ANCHO } from '../tema';

/** Alto en video de cada captura: 627 píxeles CSS a escala 1,5. */
const ALTO_CAPTURA = 941;

/** La pantalla real de la web, a todo el ancho y por encima de los subtítulos. */
export const Pantalla: React.FC<{ captura: string; visible?: number }> = ({ captura, visible = 1 }) => (
  <Img
    src={staticFile(`capturas/${captura}.png`)}
    style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: ALTO_CAPTURA, opacity: visible }}
  />
);
