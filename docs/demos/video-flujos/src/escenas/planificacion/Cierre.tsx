import React from 'react';
import { COLOR } from '../../tema';
import { apareceEn, indiceFrase } from '../../ui/anim';
import { IconoCalendario, IconoConjunto, IconoLista, IconoReloj } from '../../ui/Iconos';
import { Tarjeta } from '../../ui/Tarjeta';
import type { PropsEscena } from '../tipos';

const ANCHO_TARJETA = 400;
const SEPARACION = 40;
const IZQUIERDA = (1920 - (ANCHO_TARJETA * 4 + SEPARACION * 3)) / 2;

/** Cada tarjeta queda sobre el punto al que camina Hespo en guion-planificacion.json (c2 a c5). */
export const CENTROS_CIERRE = [0, 1, 2, 3].map((i) => IZQUIERDA + i * (ANCHO_TARJETA + SEPARACION) + ANCHO_TARJETA / 2);

const IDEAS = [
  { frase: 'c2', Icono: IconoReloj, nombre: 'Frecuencia', idea: 'cada cuánto' },
  { frase: 'c3', Icono: IconoConjunto, nombre: 'Conjunto', idea: 'dónde' },
  { frase: 'c4', Icono: IconoLista, nombre: 'Planificación', idea: 'qué toca' },
  { frase: 'c5', Icono: IconoCalendario, nombre: 'Reserva', idea: 'cuándo no molestar' },
];

export const Cierre: React.FC<PropsEscena> = ({ escena, frame }) => {
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;
  const despedida = apareceEn(escena, 'c6', frame);

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
      {IDEAS.map(({ frase: id, Icono, nombre, idea }, i) => (
        <Tarjeta
          key={id}
          x={CENTROS_CIERRE[i] - ANCHO_TARJETA / 2}
          y={200}
          ancho={ANCHO_TARJETA}
          alto={300}
          aparicion={apareceEn(escena, id, frame)}
          destacada={frase === id}
        >
          {/* Cuatro tarjetas en 1920 px: el ícono va arriba para que «Planificación» quepa entera. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Icono tamano={64} />
            <span style={{ fontSize: 40, fontWeight: 800 }}>{nombre}</span>
            <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15 }}>{idea}</span>
          </div>
        </Tarjeta>
      ))}
    </>
  );
};
