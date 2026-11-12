import React from 'react';
import { Composition, staticFile } from 'remotion';
import { guion } from './guion';
import { comprobarAudios, construirLinea, FPS, type Manifiesto } from './tiempos';
import { ALTO, ANCHO } from './tema';
import { Video } from './Video';

const calcularDuracion = async () => {
  const respuesta = await fetch(staticFile('voz/manifiesto.json'));
  if (!respuesta.ok) throw new Error('Falta public/voz/manifiesto.json: ejecuta scripts/generar_voz.py');
  const manifiesto = (await respuesta.json()) as Manifiesto;
  const linea = construirLinea(guion, manifiesto);
  await comprobarAudios(linea, async (archivo) => (await fetch(staticFile(`voz/${archivo}`), { method: 'HEAD' })).ok);
  return { durationInFrames: linea.framesTotales, props: { linea } };
};

export const Root: React.FC = () => (
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
);
