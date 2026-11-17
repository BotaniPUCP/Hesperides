import React from 'react';
import { Composition, staticFile } from 'remotion';
import { guion, guionPlanificacion, guionVenta } from './guion';
import { conCarpeta, type Medidas } from './pagina/medidasCargadas';
import { comprobarAudios, construirLinea, FPS, type Manifiesto } from './tiempos';
import { ALTO, ANCHO } from './tema';
import { Video } from './Video';
import { CARPETA_CAPTURAS, CARPETA_VOZ, COMANDO_CAPTURAS, VideoPlanificacion } from './VideoPlanificacion';
import { CARPETA_VOZ_VENTA, COMANDO_CAPTURAS_VENTA, FRAMES_COLA, VideoVenta } from './VideoVenta';
import { ComparacionHespo, Hespo2DDemo } from './hespo2d/Comparacion';
import { DURACION_DEMO } from './hespo2d/coreografia';

const calcularDuracion = async () => {
  const respuesta = await fetch(staticFile('voz/manifiesto.json'));
  if (!respuesta.ok) throw new Error('Falta public/voz/manifiesto.json: ejecuta scripts/generar_voz.py');
  const manifiesto = (await respuesta.json()) as Manifiesto;
  const linea = construirLinea(guion, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`voz/${archivo}`), { method: 'HEAD' })).ok);
  return { durationInFrames: linea.framesTotales, props: { linea } };
};

const leerJson = async <T,>(ruta: string, siFalta: string): Promise<T> => {
  const respuesta = await fetch(staticFile(ruta));
  if (!respuesta.ok) throw new Error(siFalta);
  return (await respuesta.json()) as T;
};

const FALTAN_MEDIDAS = `Falta public/${CARPETA_CAPTURAS}/medidas.json: ejecuta ${COMANDO_CAPTURAS} -- --sesion a y --sesion b`;

const calcularPlanificacion = async () => {
  const manifiesto = await leerJson<Manifiesto>(
    `${CARPETA_VOZ}/manifiesto.json`,
    `Falta public/${CARPETA_VOZ}/manifiesto.json: ejecuta scripts/generar_voz.py --guion guion-planificacion.json --salida public/${CARPETA_VOZ}`,
  );
  const origen = await leerJson<Record<string, unknown>>(`${CARPETA_CAPTURAS}/origen.json`, FALTAN_MEDIDAS);
  for (const sesion of ['a', 'b']) {
    if (!origen[sesion]) throw new Error(`Faltan las capturas de la sesión ${sesion}: ejecuta ${COMANDO_CAPTURAS} -- --sesion ${sesion}`);
  }
  const medidas = await leerJson<Medidas>(`${CARPETA_CAPTURAS}/medidas.json`, FALTAN_MEDIDAS);
  const linea = construirLinea(guionPlanificacion, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`${CARPETA_VOZ}/${archivo}`), { method: 'HEAD' })).ok);
  return { durationInFrames: linea.framesTotales, props: { linea, medidas } };
};

const calcularVenta = async () => {
  const manifiesto = await leerJson<Manifiesto>(
    `${CARPETA_VOZ_VENTA}/manifiesto.json`,
    `Falta public/${CARPETA_VOZ_VENTA}/manifiesto.json: ejecuta scripts/generar_voz.py --guion guion-venta.json --salida public/${CARPETA_VOZ_VENTA}`,
  );
  const venta = await leerJson<Medidas>('capturas/venta/medidas.json', `Falta public/capturas/venta/medidas.json: ejecuta ${COMANDO_CAPTURAS_VENTA}`);
  const planificacion = await leerJson<Medidas>(`${CARPETA_CAPTURAS}/medidas.json`, FALTAN_MEDIDAS);
  const linea = construirLinea(guionVenta, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`${CARPETA_VOZ_VENTA}/${archivo}`), { method: 'HEAD' })).ok);
  return {
    durationInFrames: linea.framesTotales + FRAMES_COLA,
    props: { linea, medidas: { ...conCarpeta('venta', venta), ...conCarpeta('planificacion', planificacion) } },
  };
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="VideoFlujos"
      component={Video}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ linea: null }}
      calculateMetadata={calcularDuracion}
    />
    <Composition
      id="VideoPlanificacion"
      component={VideoPlanificacion}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ linea: null, medidas: null }}
      calculateMetadata={calcularPlanificacion}
    />
    <Composition
      id="VideoVenta"
      component={VideoVenta}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ linea: null, medidas: null }}
      calculateMetadata={calcularVenta}
    />
    <Composition id="ComparacionHespo" component={ComparacionHespo} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={DURACION_DEMO} />
    <Composition id="Hespo2DDemo" component={Hespo2DDemo} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={DURACION_DEMO} />
  </>
);
