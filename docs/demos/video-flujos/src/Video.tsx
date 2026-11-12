import React from 'react';
import { Cierre } from './escenas/Cierre';
import type { ConfigVideo } from './escenas/componentes';
import { Ejemplares } from './escenas/Ejemplares';
import { Especies } from './escenas/Especies';
import { Incidencias } from './escenas/Incidencias';
import { Inicio } from './escenas/Inicio';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideo = { linea: Linea | null };

const CONFIG: ConfigVideo = {
  escenas: { inicio: Inicio, especies: Especies, ejemplares: Ejemplares, incidencias: Incidencias, cierre: Cierre },
  // Más pequeño sobre la página: debe caber delante de sus elementos sin taparlos.
  escalas: { inicio: 1, especies: 0.6, ejemplares: 0.6, incidencias: 0.6, cierre: 1 },
  carpetaVoz: 'voz',
};

export const Video: React.FC<PropsVideo> = ({ linea }) => (linea ? <VideoBase linea={linea} config={CONFIG} /> : null);
