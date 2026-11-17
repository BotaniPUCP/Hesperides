import React from 'react';
import { spring } from 'remotion';
import { COLOR } from '../../tema';
import { FPS } from '../../tiempos';
import { momentoDe } from '../../ui/anim';
import type { PropsEscena } from '../tipos';

/** El nombre del sistema, con la tipografía de los videos: no hay logo oficial. */
export const Titulo: React.FC<{ aparicion: number; top?: number; tamano?: number }> = ({ aparicion, top = 90, tamano = 150 }) => (
  <h1
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      margin: 0,
      textAlign: 'center',
      color: COLOR.blanco,
      fontSize: tamano,
      fontWeight: 800,
      letterSpacing: 2,
      opacity: Math.min(1, aparicion),
      transform: `scale(${0.7 + 0.3 * aparicion})`,
    }}
  >
    Hesperides
  </h1>
);

/** v4: Hespo se presenta y aparece el nombre del sistema cuando lo dice. */
export const Presentacion: React.FC<PropsEscena> = ({ escena, frame }) => {
  const dice = momentoDe(escena, 'v4', 0.6);
  return <Titulo aparicion={spring({ frame: frame - dice, fps: FPS, config: { damping: 10, stiffness: 120 } })} />;
};
