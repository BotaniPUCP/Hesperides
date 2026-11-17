import React, { useMemo } from 'react';
import type { ConfigVideo } from './escenas/componentes';
import { Aparece, Hoy, Manana, Resultado, Solucion } from './historia/escenas';
import { crearMedida, MedidasContexto, type Medidas } from './pagina/medidasCargadas';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoHistoria = { linea: Linea | null; medidas: Medidas | null };

export const CARPETA_VOZ_HISTORIA = 'voz/historia';
/** El cierre queda 3 s en pantalla después de la última frase. */
export const FRAMES_COLA_HISTORIA = 90;

const CONFIG: ConfigVideo = {
  escenas: { manana: Manana, hoy: Hoy, aparece: Aparece, solucion: Solucion, resultado: Resultado },
  escalas: { aparece: 1.05, solucion: 0.75, resultado: 0.95 },
  carpetaVoz: CARPETA_VOZ_HISTORIA,
  hespo: 'semilla',
};

const Contenido: React.FC<{ linea: Linea; medidas: Medidas }> = ({ linea, medidas }) => {
  const medida = useMemo(() => crearMedida(medidas, 'npm run capturas:venta'), [medidas]);
  return (
    <MedidasContexto.Provider value={medida}>
      <VideoBase linea={linea} config={CONFIG} />
    </MedidasContexto.Provider>
  );
};

/** Cuarto video: la venta contada como historia, con Don Julio, el jefe y Hespo Semilla. */
export const VideoHistoria: React.FC<PropsVideoHistoria> = ({ linea, medidas }) =>
  linea && medidas ? <Contenido linea={linea} medidas={medidas} /> : null;
