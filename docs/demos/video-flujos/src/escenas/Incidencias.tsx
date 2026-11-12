import React from 'react';
import { llegadaDe } from '../hespo/recorrido';
import { centro, medida } from '../pagina/medidas';
import { Pantalla } from '../pagina/Pantalla';
import { Pulso } from '../pagina/Pulso';
import { Resalte } from '../pagina/Resalte';
import { apareceEn, capturaEn, indiceFrase, momentoDe, pulsoDesde } from '../ui/anim';
import type { PropsEscena } from './tipos';

/** Lo que tarda la página en responder después de cada pulsación. */
const RESPUESTA = 14;
/** Las etapas del texto que se capturaron letra a letra, con su momento dentro de n4. */
const TEXTO_ESCRITO: [number, number][] = [[0.3, 5], [0.42, 10], [0.54, 18], [0.66, 26], [0.78, 33]];

export const Incidencias: React.FC<PropsEscena> = ({ escena, frame }) => {
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  const momento = (id: string, fraccion = 0) => momentoDe(escena, id, fraccion);
  const llega = (id: string, paso = 0) => llegadaDe(escena, id, paso);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  const pulsaInformar = llega('n2');
  const pulsaEnviar = llega('n6');
  const pulsaAprobar = llega('n6', 2);
  const pulsaMarcar = llega('n8', 1);
  const pulsaSegunda = llega('n10');
  const pulsaResolver = llega('n11');

  const captura = capturaEn(
    [
      [0, 'incidencias'],
      [pulsaInformar + RESPUESTA, 'incidencia-nueva'],
      ...TEXTO_ESCRITO.map(([fraccion, letras]): [number, string] => [momento('n4', fraccion), `incidencia-texto-${letras}`]),
      [pulsaEnviar + RESPUESTA, 'incidencia-recibida'],
      [momento('n6', 0.26), 'revision-campos'],
      [momento('n6', 0.74), 'revision-aprobar'],
      [pulsaAprobar + RESPUESTA, 'incidencia-aprobada'],
      [momento('n8'), 'incidencia-planificada'],
      [momento('n8', 0.52), 'atencion-pendiente'],
      [pulsaMarcar + RESPUESTA, 'atencion-parcial'],
      [pulsaSegunda + RESPUESTA, 'atencion-completa'],
      [pulsaResolver + RESPUESTA, 'incidencia-resuelta'],
      [momento('n12'), 'incidencia-historial'],
      [momento('n12', 0.5), 'tablero'],
      [momento('n13'), 'otra-incidencia'],
    ],
    frame,
  );

  return (
    <>
      <Pantalla captura={captura} visible={en('n1')} />
      {frase === 'n5' ? (
        <>
          <Resalte medida={medida('incidencia-texto-33', 'fotos')} visible={en('n5', 0.05)} />
          <Resalte medida={medida('incidencia-texto-33', 'tomarFoto')} visible={en('n5', 0.05)} />
          <Resalte medida={medida('incidencia-texto-33', 'ubicacion')} visible={en('n5', 0.4)} />
        </>
      ) : null}
      {captura === 'incidencia-recibida' ? <Resalte medida={medida('incidencia-recibida', 'estado')} visible={1} /> : null}
      {captura === 'revision-campos' ? (
        <>
          <Resalte medida={medida('revision-campos', 'tipo')} visible={en('n6', 0.32)} />
          <Resalte medida={medida('revision-campos', 'urgencia')} visible={en('n6', 0.44)} />
          <Resalte medida={medida('revision-campos', 'cuadrilla')} visible={en('n6', 0.56)} />
        </>
      ) : null}
      {frase === 'n7' ? (
        <>
          <Resalte medida={medida('incidencia-aprobada', 'estado')} visible={en('n7')} />
          <Resalte medida={medida('incidencia-aprobada', 'mensaje')} visible={en('n7', 0.2)} />
        </>
      ) : null}
      {captura === 'incidencia-planificada' ? <Resalte medida={medida('incidencia-planificada', 'trabajos')} visible={en('n8', 0.1)} /> : null}
      {frase === 'n9' ? <Resalte medida={medida('atencion-parcial', 'trabajos')} visible={en('n9', 0.15)} /> : null}
      {captura === 'incidencia-resuelta' ? <Resalte medida={medida('incidencia-resuelta', 'estado')} visible={1} /> : null}
      {captura === 'incidencia-historial' ? <Resalte medida={medida('incidencia-historial', 'historial')} visible={en('n12', 0.05)} /> : null}
      {captura === 'tablero' ? <Resalte medida={medida('tablero', 'metricas')} visible={en('n12', 0.56)} /> : null}
      {frase === 'n13' ? <Resalte medida={medida('otra-incidencia', 'provisional')} visible={en('n13', 0.1)} /> : null}

      <Pulso {...centro(medida('incidencias', 'informar'))} progreso={pulsoDesde(frame, pulsaInformar)} />
      <Pulso {...centro(medida('incidencia-texto-33', 'enviar'))} progreso={pulsoDesde(frame, pulsaEnviar)} />
      <Pulso {...centro(medida('revision-aprobar', 'aprobar'))} progreso={pulsoDesde(frame, pulsaAprobar)} />
      <Pulso {...centro(medida('atencion-pendiente', 'marcar'))} progreso={pulsoDesde(frame, pulsaMarcar)} />
      <Pulso {...centro(medida('atencion-parcial', 'marcar'))} progreso={pulsoDesde(frame, pulsaSegunda)} />
      <Pulso {...centro(medida('atencion-completa', 'resolver'))} progreso={pulsoDesde(frame, pulsaResolver)} />
    </>
  );
};
