import React from 'react';
import { llegadaDe } from '../hespo/recorrido';
import { centro, medida } from '../pagina/medidas';
import { Pantalla } from '../pagina/Pantalla';
import { Pulso } from '../pagina/Pulso';
import { Resalte } from '../pagina/Resalte';
import { apareceEn, indiceFrase, progresoEntre, pulsoDesde } from '../ui/anim';
import type { PropsEscena } from './tipos';

const LETRAS_DE_BUSQUEDA = 8;
const PASOS_DE_DESPLAZAMIENTO = 6;
const FRAMES_HASTA_LA_RESPUESTA = 14;
const ETAPAS_DEL_NOMBRE = [14, 11, 8, 4];
const LETRAS_DEL_NOMBRE = 14;
/** Fracción de e6 en que la página baja hasta el botón. */
const BAJA_AL_BOTON = 0.58;

export const Especies: React.FC<PropsEscena> = ({ escena, frame }) => {
  const en = (id: string, retraso = 0) => apareceEn(escena, id, frame, retraso);
  const avance = (id: string, desde: number, hasta: number) => progresoEntre(escena, id, frame, desde, hasta);
  const frase = escena.frases[indiceFrase(escena, frame)]?.frase.id;

  // La página responde cuando Hespo aterriza sobre cada elemento real.
  const pulsaEtiqueta = llegadaDe(escena, 'e4', 1);
  const abreFicha = llegadaDe(escena, 'e5', 0);
  const abreRegistro = llegadaDe(escena, 'e6', 0);
  const pulsaRegistrar = llegadaDe(escena, 'e6', 2);

  const tarjeta = medida('catalogo-filtrado', 'tarjeta');

  const captura = (() => {
    if (frame >= pulsaRegistrar + FRAMES_HASTA_LA_RESPUESTA) return 'registro-listo';
    if (frame >= abreRegistro) {
      if (avance('e6', BAJA_AL_BOTON, BAJA_AL_BOTON + 0.01) > 0) return 'registro-boton';
      const letras = Math.floor(LETRAS_DEL_NOMBRE * avance('e6', 0.3, 0.55));
      const etapa = ETAPAS_DEL_NOMBRE.find((e) => letras >= e);
      return etapa ? `registro-${etapa}` : 'registro';
    }
    if (frame >= abreFicha) return 'ficha';
    if (frame >= pulsaEtiqueta) return 'catalogo-filtrado';
    const letras = Math.floor(LETRAS_DE_BUSQUEDA * avance('e4', 0.14, 0.4));
    if (letras > 0) return `catalogo-busqueda-${letras}`;
    const paso = Math.round(PASOS_DE_DESPLAZAMIENTO * (avance('e2', 0.02, 0.16) - avance('e3', 0, 0.25)));
    return paso > 0 ? `catalogo-bajando-${paso}` : 'catalogo';
  })();

  const datoDeLaFicha = (elemento: string, retraso: number) => (
    <Resalte medida={medida('catalogo-bajando-6', elemento)} visible={en('e2', retraso)} />
  );

  return (
    <>
      <Pantalla captura={captura} visible={en('e1')} />
      {frase === 'e2' ? (
        <>
          {datoDeLaFicha('cientifico', 0.42)}
          {datoDeLaFicha('comun', 0.58)}
          {datoDeLaFicha('familia', 0.72)}
          {datoDeLaFicha('tipo', 0.84)}
        </>
      ) : null}
      {frase === 'e3' ? <Resalte medida={medida('catalogo', 'conteo')} visible={en('e3', 0.25)} /> : null}
      <Pulso {...centro(medida('catalogo', 'etiquetaArbol'))} progreso={pulsoDesde(frame, pulsaEtiqueta)} />
      <Pulso x={tarjeta.x + tarjeta.ancho / 2} y={tarjeta.y + 30} progreso={pulsoDesde(frame, abreFicha)} />
      <Pulso {...centro(medida('catalogo', 'enlaceRegistrar'))} progreso={pulsoDesde(frame, abreRegistro)} />
      <Pulso {...centro(medida('registro-boton', 'boton'))} progreso={pulsoDesde(frame, pulsaRegistrar)} />
    </>
  );
};
