import React from 'react';
import { Img, staticFile } from 'remotion';
import { useMedida } from '../../pagina/medidasCargadas';
import { medida as medidaPrimerVideo } from '../../pagina/medidas';
import { Pantalla } from '../../pagina/Pantalla';
import { Resalte } from '../../pagina/Resalte';
import { COLOR } from '../../tema';
import { apareceEn, capturaEn, momentoDe } from '../../ui/anim';
import type { PropsEscena } from '../tipos';
import { Titulo } from './Presentacion';

/** v5: el catálogo y luego un árbol con su lugar en el mapa (capturas del primer video). */
export const Informacion: React.FC<PropsEscena> = ({ escena, frame }) => {
  const captura = capturaEn([[0, 'catalogo'], [momentoDe(escena, 'v5', 0.42), 'ejemplar']], frame);
  return (
    <>
      <Pantalla captura={captura} />
      {captura === 'catalogo' ? (
        <Resalte medida={medidaPrimerVideo('catalogo', 'tarjeta')} visible={apareceEn(escena, 'v5', frame, 0.1)} />
      ) : (
        <Resalte medida={medidaPrimerVideo('ejemplar', 'ubicacion')} visible={apareceEn(escena, 'v5', frame, 0.5)} />
      )}
    </>
  );
};

/** Marco de celular: la captura del teléfono (780×1560) se ve a 400×800. */
const CELULAR = { x: 740, y: 40, ancho: 440, alto: 860, borde: 20 };
const PANTALLA_CELULAR = { ancho: CELULAR.ancho - CELULAR.borde * 2, alto: CELULAR.alto - CELULAR.borde * 2 - 20 };
const ESCALA_CELULAR = PANTALLA_CELULAR.ancho / 780;

const Celular: React.FC<{ visible: number; resalte: number }> = ({ visible, resalte }) => {
  const medida = useMedida()('venta/reporte-celular', 'texto');
  const enCelular = {
    x: medida.x * ESCALA_CELULAR,
    y: medida.y * ESCALA_CELULAR,
    ancho: medida.ancho * ESCALA_CELULAR,
    alto: medida.alto * ESCALA_CELULAR,
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: CELULAR.x,
        top: CELULAR.y,
        width: CELULAR.ancho,
        height: CELULAR.alto,
        borderRadius: 56,
        background: COLOR.borde,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        opacity: visible,
        transform: `translateY(${(1 - visible) * 40}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: CELULAR.borde,
          top: CELULAR.borde + 20,
          width: PANTALLA_CELULAR.ancho,
          height: PANTALLA_CELULAR.alto,
          borderRadius: 36,
          overflow: 'hidden',
          background: COLOR.blanco,
        }}
      >
        <Img src={staticFile('capturas/venta/reporte-celular.png')} style={{ width: PANTALLA_CELULAR.ancho }} />
        <Resalte medida={enCelular} visible={resalte} />
      </div>
      <div style={{ position: 'absolute', left: CELULAR.ancho / 2 - 50, top: 14, width: 100, height: 14, borderRadius: 7, background: COLOR.negro }} />
    </div>
  );
};

/** v6: el capataz escribe en el celular y la IA completa el resto; v7: coordinación lo activa. */
export const Reporte: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const pasaAlEscritorio = momentoDe(escena, 'v6', 0.55);
  const captura = capturaEn([[0, 'celular'], [pasaAlEscritorio, 'venta/incidencia-prellenada'], [momentoDe(escena, 'v7', 0), 'venta/incidencias-tablero']], frame);

  if (captura === 'celular') {
    return <Celular visible={apareceEn(escena, 'v6', frame, 0)} resalte={apareceEn(escena, 'v6', frame, 0.2)} />;
  }
  return (
    <>
      <Pantalla captura={captura} />
      {captura === 'venta/incidencia-prellenada' ? (
        <Resalte medida={medida('venta/incidencia-prellenada', 'prellenado')} visible={apareceEn(escena, 'v6', frame, 0.62)} />
      ) : (
        <Resalte medida={medida('venta/incidencias-tablero', 'tarjeta')} visible={apareceEn(escena, 'v7', frame, 0.15)} />
      )}
    </>
  );
};

/** v8: planificación y aviso de reserva; v9: trabajo con su evidencia. */
export const Seguimiento: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const captura = capturaEn(
    [
      [0, 'planificacion/planificacion-lista'],
      [momentoDe(escena, 'v8', 0.66), 'planificacion/intervencion-aviso-reserva'],
      [momentoDe(escena, 'v9', 0), 'venta/intervencion-evidencia'],
    ],
    frame,
  );
  return (
    <>
      <Pantalla captura={captura} />
      {captura === 'planificacion/planificacion-lista' ? (
        <Resalte medida={medida(captura, 'estado')} visible={apareceEn(escena, 'v8', frame, 0.25)} />
      ) : captura === 'planificacion/intervencion-aviso-reserva' ? (
        <Resalte medida={medida(captura, 'aviso')} visible={apareceEn(escena, 'v8', frame, 0.7)} />
      ) : (
        <>
          <Resalte medida={medida(captura, 'recibida')} visible={apareceEn(escena, 'v9', frame, 0.35)} />
          <Resalte medida={medida(captura, 'validada')} visible={apareceEn(escena, 'v9', frame, 0.6)} />
        </>
      )}
    </>
  );
};

/** v10: el mapa del campus por zonas y luego el nombre con el lema, que queda en pantalla. */
export const Final: React.FC<PropsEscena> = ({ escena, frame }) => {
  const mapa = 1 - apareceEn(escena, 'v10', frame, 0.3);
  const titulo = apareceEn(escena, 'v10', frame, 0.38);
  const lema = apareceEn(escena, 'v10', frame, 0.5);
  return (
    <>
      {mapa > 0 ? <Pantalla captura="venta/mapa-zonas" visible={mapa} /> : null}
      <Titulo aparicion={titulo} top={120} />
      <p
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 330,
          margin: 0,
          textAlign: 'center',
          color: COLOR.arena,
          fontSize: 54,
          fontWeight: 700,
          opacity: lema,
        }}
      >
        Sus áreas verdes: visibles, ordenadas y con seguimiento.
      </p>
    </>
  );
};
