import React from 'react';
import { llegadaDe } from '../../hespo/recorrido';
import { centro, useMedida } from '../../pagina/medidasCargadas';
import { Pantalla } from '../../pagina/Pantalla';
import { Pulso } from '../../pagina/Pulso';
import { Resalte } from '../../pagina/Resalte';
import { apareceDesde, apareceEn, capturaEn, indiceFrase, momentoDe, pulsoDesde } from '../../ui/anim';
import type { PropsEscena } from '../tipos';
import { FRAMES_HASTA_LA_RESPUESTA as R } from './comun';

/**
 * Resaltes por frase: [captura, elemento, desde, hasta], en fracciones de la frase. Cada uno
 * aparece cuando se nombra lo que marca y se va cuando se pasa a lo siguiente.
 */
const RESALTES: Record<string, [string, string, number, number][]> = {
  p2: [['conjuntos-lista', 'tarjeta', 0.2, 0.62], ['conjuntos-lista', 'cantidad', 0.62, 1.2]],
  p4: [['planificacion-nueva', 'conjunto', 0.45, 0.7], ['planificacion-nueva', 'actividad', 0.7, 0.86], ['planificacion-nueva', 'frecuencia', 0.86, 1.2]],
  p5: [['planificacion-lista', 'ultimaVez', 0.52, 0.76], ['planificacion-lista', 'sueleRealizarse', 0.76, 0.9], ['planificacion-lista', 'estado', 0.9, 1.2]],
  p6: [['inicio', 'bloqueAtrasados', 0.45, 0.68], ['inicio', 'bloqueVencen', 0.68, 1.2]],
  p8: [['planificacion-lista', 'estado', 0.1, 0.5], ['planificacion-lista', 'filtros', 0.5, 1.2]],
  p9: [['planificacion-elegida', 'mapa', 0.4, 1.2]],
  p10: [['planificacion-elegida', 'alDia', 0.15, 0.6], ['planificacion-elegida', 'botonPlanificar', 0.6, 1.2]],
  p11: [['intervencion-prellenada', 'actividad', 0.65, 0.8], ['intervencion-prellenada', 'fecha', 0.8, 0.9], ['intervencion-prellenada', 'aviso', 0.9, 1.2]],
  p12: [['intervencion-prellenada-pie', 'guardar', 0.4, 1.2]],
};

/** En p13, «cuando el capataz empieza»: la tarjeta pasa de programada a en curso. */
const EMPIEZA_EL_CAPATAZ = 0.55;
/** En p3, la lista crecida se resalta poco después de soltar el arrastre. */
const FRAMES_HASTA_LA_LISTA = 8;
/** En p13, el estado programado se resalta poco después de pulsar guardar. */
const FRAMES_HASTA_EL_ESTADO = 6;

export const Planificacion: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  // La página responde cuando Hespo aterriza sobre cada elemento real.
  const eligeJardin = llegadaDe(escena, 'p3', 0);
  const empiezaArrastre = llegadaDe(escena, 'p3', 1);
  const sueltaArrastre = llegadaDe(escena, 'p3', 2);
  const pulsaIr = llegadaDe(escena, 'p7', 0);
  const eligeTarjeta = llegadaDe(escena, 'p9', 0);
  const pulsaPlanificar = llegadaDe(escena, 'p11', 0);
  const pulsaGuardar = llegadaDe(escena, 'p13', 0);

  const captura = capturaEn(
    [
      [0, 'conjuntos-lista'],
      [momentoDe(escena, 'p3', 0), 'conjunto-selector-0'],
      [eligeJardin + R, 'conjunto-selector-1'],
      [empiezaArrastre, 'conjunto-selector-arrastre'],
      [sueltaArrastre, 'conjunto-selector-2'],
      [momentoDe(escena, 'p4', 0), 'planificacion-nueva'],
      [momentoDe(escena, 'p5', 0), 'planificacion-lista'],
      [momentoDe(escena, 'p6', 0), 'inicio'],
      [pulsaIr + R, 'planificacion-lista'],
      [eligeTarjeta + R, 'planificacion-elegida'],
      [pulsaPlanificar + R, 'intervencion-prellenada'],
      [momentoDe(escena, 'p12', 0), 'intervencion-prellenada-pie'],
      [pulsaGuardar + R, 'planificacion-programada'],
      [momentoDe(escena, 'p13', EMPIEZA_EL_CAPATAZ), 'planificacion-en-curso'],
    ],
    frame,
  );

  const resalte = (c: string, elemento: string, visible: number) => (
    <Resalte key={`${c}-${elemento}`} medida={medida(c, elemento)} visible={visible} />
  );
  const resaltesDeLaFrase = frase && RESALTES[frase] ? RESALTES[frase] : [];

  return (
    <>
      <Pantalla captura={`planificacion/${captura}`} visible={en('p1')} />
      {resaltesDeLaFrase.map(([c, elemento, desde, hasta]) => resalte(c, elemento, en(frase!, desde) - en(frase!, hasta)))}
      {captura === 'conjunto-selector-2' ? resalte('conjunto-selector-2', 'lista', apareceDesde(frame, sueltaArrastre + FRAMES_HASTA_LA_LISTA)) : null}
      {frase === 'p13'
        ? captura === 'planificacion-en-curso'
          ? [resalte('planificacion-en-curso', 'estado', en('p13', EMPIEZA_EL_CAPATAZ + 0.05)), resalte('planificacion-en-curso', 'detalle', en('p13', EMPIEZA_EL_CAPATAZ + 0.2))]
          : captura === 'planificacion-programada'
            ? [
                resalte('planificacion-programada', 'estado', apareceDesde(frame, pulsaGuardar + FRAMES_HASTA_EL_ESTADO)),
                resalte('planificacion-programada', 'detalle', apareceDesde(frame, pulsaGuardar + FRAMES_HASTA_EL_ESTADO)),
              ]
            : null
        : null}
      <Pulso {...centro(medida('conjunto-selector-0', 'jardinClic'))} progreso={pulsoDesde(frame, eligeJardin)} />
      <Pulso {...centro(medida('conjunto-selector-0', 'inicioArrastre'))} progreso={pulsoDesde(frame, empiezaArrastre)} />
      <Pulso {...centro(medida('inicio', 'irAPlanificacion'))} progreso={pulsoDesde(frame, pulsaIr)} />
      <Pulso {...centro(medida('planificacion-lista', 'primeraTarjeta'))} progreso={pulsoDesde(frame, eligeTarjeta)} />
      <Pulso {...centro(medida('planificacion-elegida', 'botonPlanificar'))} progreso={pulsoDesde(frame, pulsaPlanificar)} />
      <Pulso {...centro(medida('intervencion-prellenada-pie', 'guardar'))} progreso={pulsoDesde(frame, pulsaGuardar)} />
    </>
  );
};
