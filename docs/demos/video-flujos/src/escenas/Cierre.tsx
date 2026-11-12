import React from 'react';
import { COLOR } from '../tema';
import { apareceEn, indiceFrase } from '../ui/anim';
import { IconoAviso, IconoHoja, IconoPlanta } from '../ui/Iconos';
import { Tarjeta } from '../ui/Tarjeta';
import type { PropsEscena } from './tipos';

const ANCHO_TARJETA = 500;

/** Cada tarjeta queda sobre el punto al que camina Hespo en guion.json. */
const IDEAS = [
  { frase: 'c2', x: 420, Icono: IconoHoja, nombre: 'Especie', idea: 'qué es' },
  { frase: 'c3', x: 960, Icono: IconoPlanta, nombre: 'Ejemplar', idea: 'dónde está' },
  { frase: 'c4', x: 1500, Icono: IconoAviso, nombre: 'Incidencia', idea: 'qué pasó' },
];

export const Cierre: React.FC<PropsEscena> = ({ escena, frame }) => {
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;
  const despedida = apareceEn(escena, 'c5', frame);

  return (
    <>
      <h1
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 40,
          margin: 0,
          textAlign: 'center',
          color: COLOR.blanco,
          fontSize: 96,
          fontWeight: 800,
          opacity: despedida,
        }}
      >
        Hesperides
      </h1>
      {IDEAS.map(({ frase: id, x, Icono, nombre, idea }) => (
        <Tarjeta
          key={id}
          x={x - ANCHO_TARJETA / 2}
          y={200}
          ancho={ANCHO_TARJETA}
          alto={220}
          aparicion={apareceEn(escena, id, frame)}
          destacada={frase === id}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: '100%' }}>
            <Icono />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 48, fontWeight: 800 }}>{nombre}</span>
              <span style={{ fontSize: 40, fontWeight: 700 }}>{idea}</span>
            </div>
          </div>
        </Tarjeta>
      ))}
    </>
  );
};
