import React from 'react';
import { Composition, staticFile } from 'remotion';
import { guion, guionHistoria, guionPlanificacion, guionQueEs, guionVenta } from './guion';
import { conCarpeta, type Medidas } from './pagina/medidasCargadas';
import { comprobarAudios, construirLinea, FPS, type Manifiesto } from './tiempos';
import { ALTO, ANCHO } from './tema';
import { Video } from './Video';
import { CARPETA_CAPTURAS, CARPETA_VOZ, COMANDO_CAPTURAS, VideoPlanificacion } from './VideoPlanificacion';
import { CARPETA_VOZ_VENTA, COMANDO_CAPTURAS_VENTA, FRAMES_COLA, VideoVenta } from './VideoVenta';
import { ComparacionHespo, Hespo2DDemo } from './hespo2d/Comparacion';
import { DURACION_DEMO } from './hespo2d/coreografia';
import { HojaDeExpresiones, RedisenosHespo, Retratos } from './hespo2d/v2/Redisenos';
import { VARIANTES_SEMILLA } from './hespo2d/v2/disenos';
import { CARPETA_VOZ_HISTORIA, FRAMES_COLA_HISTORIA, VideoHistoria } from './VideoHistoria';
import { CARPETA_SFX, CARPETA_VOZ_QUE_ES, COMANDO_CAPTURAS_QUE_ES, FRAMES_COLA_QUE_ES, SONIDOS, VideoQueEsHesperides } from './VideoQueEsHesperides';
import type { CajasDelMapa } from './queEs/piezas';

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

const calcularHistoria = async () => {
  const manifiesto = await leerJson<Manifiesto>(
    `${CARPETA_VOZ_HISTORIA}/manifiesto.json`,
    `Falta public/${CARPETA_VOZ_HISTORIA}/manifiesto.json: ejecuta scripts/generar_voz.py --guion guion-historia.json --salida public/${CARPETA_VOZ_HISTORIA}`,
  );
  const venta = await leerJson<Medidas>('capturas/venta/medidas.json', `Falta public/capturas/venta/medidas.json: ejecuta ${COMANDO_CAPTURAS_VENTA}`);
  const linea = construirLinea(guionHistoria, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`${CARPETA_VOZ_HISTORIA}/${archivo}`), { method: 'HEAD' })).ok);
  return { durationInFrames: linea.framesTotales + FRAMES_COLA_HISTORIA, props: { linea, medidas: conCarpeta('venta', venta) } };
};

const calcularQueEs = async () => {
  const manifiesto = await leerJson<Manifiesto>(
    `${CARPETA_VOZ_QUE_ES}/manifiesto.json`,
    `Falta public/${CARPETA_VOZ_QUE_ES}/manifiesto.json: ejecuta scripts/generar_voz.py --guion guion-que-es-hesperides.json --salida public/${CARPETA_VOZ_QUE_ES}`,
  );
  const cajas = await leerJson<CajasDelMapa>('capturas/que-es/medidas.json', `Falta public/capturas/que-es/medidas.json: ejecuta ${COMANDO_CAPTURAS_QUE_ES}`);
  const linea = construirLinea(guionQueEs, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`${CARPETA_VOZ_QUE_ES}/${archivo}`), { method: 'HEAD' })).ok);
  const presentes = await Promise.all(SONIDOS.map(async (s) => (await fetch(staticFile(`${CARPETA_SFX}/${s}.wav`), { method: 'HEAD' })).ok));
  const faltan = SONIDOS.filter((_, i) => !presentes[i]);
  if (faltan.length > 0) throw new Error(`Faltan los efectos de sonido ${faltan.join(', ')} en public/${CARPETA_SFX}: ejecuta npm run sfx`);
  return { durationInFrames: linea.framesTotales + FRAMES_COLA_QUE_ES, props: { linea, cajas } };
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
    <Composition id="RedisenosHespo" component={RedisenosHespo} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={DURACION_DEMO} />
    <Composition id="HojaDeExpresiones" component={HojaDeExpresiones} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={1} />
    <Composition id="VariantesSemilla" component={RedisenosHespo} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={DURACION_DEMO} defaultProps={{ disenos: VARIANTES_SEMILLA }} />
    <Composition
      id="VideoHistoria"
      component={VideoHistoria}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ linea: null, medidas: null }}
      calculateMetadata={calcularHistoria}
    />
    <Composition
      id="VideoQueEsHesperides"
      component={VideoQueEsHesperides}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ linea: null, cajas: null }}
      calculateMetadata={calcularQueEs}
    />
    <Composition id="RetratosSemilla" component={Retratos} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={1} defaultProps={{ disenos: VARIANTES_SEMILLA }} />
    <Composition id="ExpresionesSemilla" component={HojaDeExpresiones} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={1} defaultProps={{ disenos: VARIANTES_SEMILLA }} />
  </>
);
