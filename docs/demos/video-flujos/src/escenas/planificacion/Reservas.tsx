import React from 'react';
import { Pantalla } from '../../pagina/Pantalla';
import { apareceEn } from '../../ui/anim';
import type { PropsEscena } from '../tipos';

export const Reservas: React.FC<PropsEscena> = ({ escena, frame }) => (
  <Pantalla captura="planificacion/reservas-agenda" visible={apareceEn(escena, 'r1', frame)} />
);
