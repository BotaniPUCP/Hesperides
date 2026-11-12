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

export const Ejemplares: React.FC<PropsEscena> = ({ escena, frame }) => {
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  const momento = (id: string, fraccion = 0) => momentoDe(escena, id, fraccion);
  const llega = (id: string, paso = 0) => llegadaDe(escena, id, paso);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  const pulsaRegistrar = llega('j4');
  const marcaMapa = llega('j4', 2);
  const pulsaGuardar = llega('j5');
  const pulsaEsOtra = llega('j6', 1);
  const pulsaImportar = llega('j7');
  const pulsaRevisar = llega('j8');
  const pulsaConfirmar = llega('j8', 2);

  const captura = capturaEn(
    [
      [0, 'ejemplares'],
      [pulsaRegistrar, 'planta'],
      [momento('j4', 0.24), 'planta-especie'],
      [momento('j4', 0.34), 'planta-punto'],
      [momento('j4', 0.66), 'planta-medicion'],
      [momento('j4', 0.84), 'planta-evaluacion'],
      [momento('j5'), 'planta-boton'],
      [pulsaGuardar + RESPUESTA, 'planta-aviso'],
      [pulsaEsOtra + RESPUESTA, 'planta-lista'],
      [pulsaImportar + RESPUESTA, 'importar'],
      [momento('j7', 0.62), 'importar-archivo'],
      [pulsaRevisar + RESPUESTA, 'importar-vista'],
      [momento('j8', 0.56), 'importar-decidido'],
      [pulsaConfirmar + RESPUESTA, 'importar-listo'],
      [momento('j9'), 'ejemplar'],
      [momento('j9', 0.6), 'ejemplar-historial'],
    ],
    frame,
  );

  return (
    <>
      <Pantalla captura={captura} visible={en('j1')} />
      {frase === 'j2' ? <Resalte medida={medida('ejemplares', 'primero')} visible={en('j2', 0.15)} /> : null}
      {frase === 'j3' ? (
        <>
          <Resalte medida={medida('ejemplares', 'censado')} visible={en('j3', 0.05)} />
          <Resalte medida={medida('ejemplares', 'codigo')} visible={en('j3', 0.45)} />
        </>
      ) : null}
      {frase === 'j6' ? (
        <>
          <Resalte medida={medida('planta-aviso', 'esOtra')} visible={en('j6', 0.1)} />
          <Resalte medida={medida('planta-aviso', 'revisar')} visible={en('j6', 0.1)} />
        </>
      ) : null}
      {captura === 'ejemplar' ? (
        <>
          <Resalte medida={medida('ejemplar', 'ubicacion')} visible={en('j9', 0.2)} />
          <Resalte medida={medida('ejemplar', 'medidas')} visible={en('j9', 0.36)} />
        </>
      ) : null}
      {captura === 'ejemplar-historial' ? <Resalte medida={medida('ejemplar-historial', 'historial')} visible={en('j9', 0.66)} /> : null}

      <Pulso {...centro(medida('ejemplares', 'enlaceRegistrar'))} progreso={pulsoDesde(frame, pulsaRegistrar)} />
      <Pulso x={1150} y={720} progreso={pulsoDesde(frame, marcaMapa)} />
      <Pulso {...centro(medida('planta-boton', 'registrar'))} progreso={pulsoDesde(frame, pulsaGuardar)} />
      <Pulso {...centro(medida('planta-aviso', 'esOtra'))} progreso={pulsoDesde(frame, pulsaEsOtra)} />
      <Pulso {...centro(medida('planta-lista', 'enlaceImportar'))} progreso={pulsoDesde(frame, pulsaImportar)} />
      <Pulso {...centro(medida('importar-archivo', 'revisar'))} progreso={pulsoDesde(frame, pulsaRevisar)} />
      <Pulso {...centro(medida('importar-decidido', 'confirmar'))} progreso={pulsoDesde(frame, pulsaConfirmar)} />
    </>
  );
};
