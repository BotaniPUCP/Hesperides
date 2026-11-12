import React, { useMemo } from 'react';
import type { ConfigVideo } from './escenas/componentes';
import { Cierre } from './escenas/planificacion/Cierre';
import { Frecuencias } from './escenas/planificacion/Frecuencias';
import { Inicio } from './escenas/planificacion/Inicio';
import { Planificacion } from './escenas/planificacion/Planificacion';
import { Reservas } from './escenas/planificacion/Reservas';
import { crearMedida, MedidasContexto, type Medidas } from './pagina/medidasCargadas';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoPlanificacion = { linea: Linea | null; medidas: Medidas | null };

export const CARPETA_VOZ = 'voz/planificacion';
export const CARPETA_CAPTURAS = 'capturas/planificacion';
export const COMANDO_CAPTURAS = 'npm run capturas:planificacion';

const CONFIG: ConfigVideo = {
  escenas: { inicio: Inicio, frecuencias: Frecuencias, planificacion: Planificacion, reservas: Reservas, cierre: Cierre },
  // Más pequeño sobre la página: debe caber delante de sus elementos sin taparlos.
  escalas: { inicio: 1, frecuencias: 0.6, planificacion: 0.6, reservas: 0.6, cierre: 1 },
  carpetaVoz: CARPETA_VOZ,
};

const Contenido: React.FC<{ linea: Linea; medidas: Medidas }> = ({ linea, medidas }) => {
  const medida = useMemo(() => crearMedida(medidas, COMANDO_CAPTURAS), [medidas]);
  return (
    <MedidasContexto.Provider value={medida}>
      <VideoBase linea={linea} config={CONFIG} />
    </MedidasContexto.Provider>
  );
};

/** Segundo video: Frecuencias, Planificación y Reservas de jardines. */
export const VideoPlanificacion: React.FC<PropsVideoPlanificacion> = ({ linea, medidas }) =>
  linea && medidas ? <Contenido linea={linea} medidas={medidas} /> : null;
