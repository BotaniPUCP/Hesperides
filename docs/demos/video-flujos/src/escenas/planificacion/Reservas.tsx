import React from 'react';
import { llegadaDe } from '../../hespo/recorrido';
import { centro, useMedida } from '../../pagina/medidasCargadas';
import { Pantalla } from '../../pagina/Pantalla';
import { Pulso } from '../../pagina/Pulso';
import { Resalte } from '../../pagina/Resalte';
import { apareceEn, capturaEn, indiceFrase, momentoDe, pulsoDesde } from '../../ui/anim';
import type { PropsEscena } from '../tipos';
import { FRAMES_HASTA_LA_RESPUESTA as R } from './comun';

/**
 * Resaltes por frase: [captura, elemento, desde, hasta], en fracciones de la frase. Cada uno
 * aparece cuando se nombra lo que marca y se va cuando se pasa a lo siguiente.
 */
const RESALTES: Record<string, [string, string, number, number][]> = {
  r2: [
    ['reservas-agenda-dias', 'jardin', 0.1, 0.45],
    ['reservas-agenda-dias', 'pedidoDe', 0.45, 0.65],
    ['reservas-agenda-dias', 'encabezadoHoy', 0.65, 0.8],
    ['reservas-agenda-dias', 'horario', 0.8, 1.2],
  ],
  r3: [
    ['reservas-agenda-dias', 'encabezadoHoy', 0.2, 0.5],
    ['reservas-agenda-dias', 'encabezadoManana', 0.2, 0.5],
    ['reservas-agenda-dias', 'estadoProxima', 0.62, 0.75],
    ['reservas-agenda-dias', 'estadoEnCurso', 0.75, 0.88],
    ['reservas-agenda-dias', 'estadoTerminada', 0.88, 1.2],
  ],
  r4: [['reservas-agenda', 'filtroJardin', 0.2, 0.4], ['reservas-agenda', 'filtroOrganizacion', 0.4, 1.2]],
  r6: [['reserva-nueva-4', 'responsable', 0.1, 1.2]],
  r7: [['reserva-nueva-5', 'avisos', 0.3, 1.2]],
  r9: [['intervencion-aviso-reserva', 'aviso', 0.45, 1.2]],
  r10: [['intervencion-aviso-reserva-pie', 'guardar', 0.3, 1.2]],
};

/** En r5, el formulario se llena cuando se nombra cada campo: [fracción, captura, elemento]. */
const CAMPOS_R5: [number, string, string][] = [
  [0.33, 'reserva-nueva-1', 'jardin'],
  [0.43, 'reserva-nueva-2', 'horario'],
  [0.57, 'reserva-nueva-3', 'pedidoDe'],
  [0.8, 'reserva-nueva-4', 'solicitante'],
];
/** En r8, el mapa se resalta cuando se nombra. */
const SE_NOMBRA_EL_MAPA = 0.65;

export const Reservas: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  // La página responde cuando Hespo aterriza sobre cada botón real.
  const pulsaNueva = llegadaDe(escena, 'r5', 0);
  const pulsaRegistrar = llegadaDe(escena, 'r8', 0);

  const captura = capturaEn(
    [
      [0, 'reservas-agenda'],
      [momentoDe(escena, 'r2', 0), 'reservas-agenda-dias'],
      [momentoDe(escena, 'r4', 0), 'reservas-agenda'],
      [pulsaNueva + R, 'reserva-nueva-0'],
      ...CAMPOS_R5.map(([fraccion, c]): [number, string] => [momentoDe(escena, 'r5', fraccion), c]),
      [momentoDe(escena, 'r7', 0), 'reserva-nueva-5'],
      [pulsaRegistrar + R, 'reserva-ficha'],
      [momentoDe(escena, 'r9', 0), 'intervencion-aviso-reserva'],
      [momentoDe(escena, 'r10', 0), 'intervencion-aviso-reserva-pie'],
    ],
    frame,
  );

  const resalte = (c: string, elemento: string, visible: number) => (
    <Resalte key={`${c}-${elemento}`} medida={medida(c, elemento)} visible={visible} />
  );
  const resaltesDeLaFrase = frase && RESALTES[frase] ? RESALTES[frase] : [];
  const campoActual = frase === 'r5' ? CAMPOS_R5.filter(([, c]) => c === captura).at(-1) : undefined;

  return (
    <>
      <Pantalla captura={`planificacion/${captura}`} visible={en('r1')} />
      {resaltesDeLaFrase.map(([c, elemento, desde, hasta]) => resalte(c, elemento, en(frase!, desde) - en(frase!, hasta)))}
      {campoActual ? resalte(campoActual[1], campoActual[2], en('r5', campoActual[0])) : null}
      {frase === 'r8' && captura === 'reserva-ficha'
        ? [
            resalte('reserva-ficha', 'banner', en('r8', 0.05) - en('r8', SE_NOMBRA_EL_MAPA)),
            resalte('reserva-ficha', 'mapa', en('r8', SE_NOMBRA_EL_MAPA)),
          ]
        : null}
      <Pulso {...centro(medida('reservas-agenda', 'nuevaReserva'))} progreso={pulsoDesde(frame, pulsaNueva)} />
      <Pulso {...centro(medida('reserva-nueva-5', 'guardar'))} progreso={pulsoDesde(frame, pulsaRegistrar)} />
    </>
  );
};
