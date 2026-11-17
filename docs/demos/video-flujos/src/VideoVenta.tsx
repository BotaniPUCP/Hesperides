import React, { useMemo } from 'react';
import type { ConfigVideo } from './escenas/componentes';
import { Final, Informacion, Reporte, Seguimiento } from './escenas/venta/pantallas';
import { Presentacion } from './escenas/venta/Presentacion';
import { Problema } from './escenas/venta/Problema';
import { crearMedida, MedidasContexto, type Medidas } from './pagina/medidasCargadas';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoVenta = { linea: Linea | null; medidas: Medidas | null };

export const CARPETA_VOZ_VENTA = 'voz/venta';
export const COMANDO_CAPTURAS_VENTA = 'npm run capturas:venta';
/** El cierre queda en pantalla 2,5 s después de la última frase (diseño, CE-01). */
export const FRAMES_COLA = 75;

const CONFIG: ConfigVideo = {
  escenas: { problema: Problema, presentacion: Presentacion, informacion: Informacion, reporte: Reporte, seguimiento: Seguimiento, final: Final },
  // Más pequeño sobre la página: debe caber delante de sus elementos sin taparlos.
  escalas: { problema: 1, presentacion: 1, final: 1, informacion: 0.6, reporte: 0.6, seguimiento: 0.6 },
  carpetaVoz: CARPETA_VOZ_VENTA,
  hespo: '3d',
};

const Contenido: React.FC<{ linea: Linea; medidas: Medidas }> = ({ linea, medidas }) => {
  const medida = useMemo(() => crearMedida(medidas, COMANDO_CAPTURAS_VENTA), [medidas]);
  return (
    <MedidasContexto.Provider value={medida}>
      <VideoBase linea={linea} config={CONFIG} />
    </MedidasContexto.Provider>
  );
};

/** Tercer video: presentación de Hesperides para el cliente, con Hespo en 3D. */
export const VideoVenta: React.FC<PropsVideoVenta> = ({ linea, medidas }) =>
  linea && medidas ? <Contenido linea={linea} medidas={medidas} /> : null;
