import React from 'react';
import { llegadaDe } from '../../hespo/recorrido';
import { centro, useMedida } from '../../pagina/medidasCargadas';
import { Pantalla } from '../../pagina/Pantalla';
import { Pulso } from '../../pagina/Pulso';
import { Resalte } from '../../pagina/Resalte';
import { apareceEn, capturaEn, indiceFrase, momentoDe, pulsoDesde } from '../../ui/anim';
import type { PropsEscena } from '../tipos';
import { FRAMES_HASTA_LA_RESPUESTA } from './comun';

const LISTA = 'frecuencias-lista';
const FICHA = 'frecuencia-ficha';
const PIE = 'frecuencia-ficha-pie';

/** En f3, cada forma se resalta mientras se nombra: [elemento, desde, hasta] en fracciones de la frase. */
const FORMAS: [string, number, number][] = [
  ['columnaFrecuencia', 0.04, 0.3],
  ['filaEjemplo', 0.3, 0.5],
  ['filaEstacion', 0.5, 0.68],
  ['filaVeces', 0.68, 0.86],
  ['filaTemporada', 0.86, 1.2],
];

export const Frecuencias: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  /** Aparece al llegar a `desde` y se va al llegar a `hasta`. */
  const entre = (id: string, desde: number, hasta: number) => en(id, desde) - en(id, hasta);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  // La pantalla responde cuando Hespo aterriza sobre la fila; en f5 la ficha baja hasta su aviso.
  const abreFicha = llegadaDe(escena, 'f4', 0);
  const bajaAlAviso = momentoDe(escena, 'f5', 0);
  const captura = capturaEn([[0, LISTA], [abreFicha + FRAMES_HASTA_LA_RESPUESTA, FICHA], [bajaAlAviso, PIE]], frame);
  const resalte = (c: string, elemento: string, visible: number) => <Resalte key={`${c}-${elemento}`} medida={medida(c, elemento)} visible={visible} />;

  return (
    <>
      <Pantalla captura={`planificacion/${captura}`} visible={en('f1')} />
      {frase === 'f2' ? [resalte(LISTA, 'filaEjemplo', entre('f2', 0.1, 0.7)), resalte(LISTA, 'frecuenciaEjemplo', en('f2', 0.7))] : null}
      {frase === 'f3' ? FORMAS.map(([elemento, desde, hasta]) => resalte(LISTA, elemento, entre('f3', desde, hasta))) : null}
      {frase === 'f4' && captura === FICHA
        ? [resalte(FICHA, 'seAplicaA', entre('f4', 0.28, 0.66)), resalte(FICHA, 'modalidad', en('f4', 0.66))]
        : null}
      {frase === 'f5' ? resalte(PIE, 'aviso', en('f5', 0.1)) : null}
      <Pulso {...centro(medida(LISTA, 'frecuenciaEjemplo'))} progreso={pulsoDesde(frame, abreFicha)} />
    </>
  );
};
