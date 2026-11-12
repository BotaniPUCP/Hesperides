import React from 'react';
import { COLOR } from '../tema';
import { apareceEn, indiceFrase } from '../ui/anim';
import { IconoAviso, IconoHoja, IconoPlanta } from '../ui/Iconos';
import { Tarjeta } from '../ui/Tarjeta';
import type { PropsEscena } from './tipos';

const MODULOS = [
  { nombre: 'Especies', Icono: IconoHoja, retraso: 0.4 },
  { nombre: 'Ejemplares', Icono: IconoPlanta, retraso: 0.6 },
  { nombre: 'Incidencias', Icono: IconoAviso, retraso: 0.82 },
];
const ANCHO_TARJETA = 480;
const SEPARACION = 40;
const IZQUIERDA = (1920 - (ANCHO_TARJETA * 3 + SEPARACION * 2)) / 2;

export const Inicio: React.FC<PropsEscena> = ({ escena, frame }) => {
  const titulo = apareceEn(escena, 'i2', frame, 0.1);
  const enLista = indiceFrase(escena, frame) === 2;

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
      {MODULOS.map(({ nombre, Icono, retraso }, i) => {
        const aparicion = apareceEn(escena, 'i3', frame, retraso);
        const siguiente = MODULOS[i + 1];
        const hablandoDeEste = enLista && aparicion > 0 && (!siguiente || apareceEn(escena, 'i3', frame, siguiente.retraso) === 0);
        return (
          <Tarjeta
            key={nombre}
            x={IZQUIERDA + i * (ANCHO_TARJETA + SEPARACION)}
            y={260}
            ancho={ANCHO_TARJETA}
            alto={180}
            aparicion={aparicion}
            destacada={hablandoDeEste}
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
