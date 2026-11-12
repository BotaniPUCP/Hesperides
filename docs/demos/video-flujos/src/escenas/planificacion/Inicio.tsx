import React from 'react';
import { COLOR } from '../../tema';
import { apareceEn, indiceFrase } from '../../ui/anim';
import { IconoCalendario, IconoLista, IconoReloj } from '../../ui/Iconos';
import { Tarjeta } from '../../ui/Tarjeta';
import type { PropsEscena } from '../tipos';

/** Las tres partes que nombra i4, cada una cuando se dice. */
const PARTES = [
  { nombre: 'Frecuencias', Icono: IconoReloj, retraso: 0.32 },
  { nombre: 'Planificación', Icono: IconoLista, retraso: 0.56 },
  { nombre: 'Reservas', Icono: IconoCalendario, retraso: 0.8 },
];
const ANCHO_TARJETA = 520;
const SEPARACION = 40;
const IZQUIERDA = (1920 - (ANCHO_TARJETA * 3 + SEPARACION * 2)) / 2;

export const Inicio: React.FC<PropsEscena> = ({ escena, frame }) => {
  const titulo = apareceEn(escena, 'i2', frame, 0.1);
  const enLista = indiceFrase(escena, frame) === 3;

  return (
    <>
      <h1
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 70,
          margin: 0,
          textAlign: 'center',
          color: COLOR.blanco,
          fontSize: 120,
          fontWeight: 800,
          opacity: titulo,
        }}
      >
        Hesperides
      </h1>
      {PARTES.map(({ nombre, Icono, retraso }, i) => {
        const aparicion = apareceEn(escena, 'i4', frame, retraso);
        const siguiente = PARTES[i + 1];
        const hablandoDeEsta = enLista && aparicion > 0 && (!siguiente || apareceEn(escena, 'i4', frame, siguiente.retraso) === 0);
        return (
          <Tarjeta
            key={nombre}
            x={IZQUIERDA + i * (ANCHO_TARJETA + SEPARACION)}
            y={260}
            ancho={ANCHO_TARJETA}
            alto={180}
            aparicion={aparicion}
            destacada={hablandoDeEsta}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: '100%' }}>
              <Icono />
              <span style={{ fontSize: 48, fontWeight: 800 }}>{nombre}</span>
            </div>
          </Tarjeta>
        );
      })}
    </>
  );
};
