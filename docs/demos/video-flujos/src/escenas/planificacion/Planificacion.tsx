import React from 'react';
import { Pantalla } from '../../pagina/Pantalla';
import { apareceEn } from '../../ui/anim';
import type { PropsEscena } from '../tipos';

export const Planificacion: React.FC<PropsEscena> = ({ escena, frame }) => (
  <Pantalla captura="planificacion/conjuntos-lista" visible={apareceEn(escena, 'p1', frame)} />
);
