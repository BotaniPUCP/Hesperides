import React from 'react';
import { Pantalla } from '../../pagina/Pantalla';
import { apareceEn } from '../../ui/anim';
import type { PropsEscena } from '../tipos';

export const Frecuencias: React.FC<PropsEscena> = ({ escena, frame }) => (
  <Pantalla captura="planificacion/frecuencias-lista" visible={apareceEn(escena, 'f1', frame)} />
);
