import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { ConfigVideo } from './escenas/componentes';
import { Acabado } from './historia/Acabado';
import {
  ActividadEscena,
  BandejaEscena,
  CalendarioEscena,
  CampusEscena,
  CierraEscena,
  CuadrillaEscena,
  FuturoEscena,
  GloboEscena,
  HistorialEscena,
  JulioEscena,
  JuntosEscena,
  LogoEscena,
  LuciaEscena,
  ObservacionEscena,
  QueEs,
  SanoEscena,
  TuberiaEscena,
} from './queEs/escenas';
import { CajasContexto, type CajasDelMapa } from './queEs/piezas';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoQueEs = { linea: Linea | null; cajas: CajasDelMapa | null };

export const CARPETA_VOZ_QUE_ES = 'voz/que-es-hesperides';
export const COMANDO_CAPTURAS_QUE_ES = 'npx tsx scripts/capturas-que-es-hesperides.ts';
/** El logo queda 3 s en pantalla después de la última frase. */
export const FRAMES_COLA_QUE_ES = 90;

const CONFIG: ConfigVideo = {
  escenas: {
    queEs: QueEs,
    lucia: LuciaEscena,
    julio: JulioEscena,
    campus: CampusEscena,
    tuberia: TuberiaEscena,
    bandeja: BandejaEscena,
    actividad: ActividadEscena,
    calendario: CalendarioEscena,
    cuadrilla: CuadrillaEscena,
    globo: GloboEscena,
    observacion: ObservacionEscena,
    historial: HistorialEscena,
    cierra: CierraEscena,
    sano: SanoEscena,
    futuro: FuturoEscena,
    juntos: JuntosEscena,
    logo: LogoEscena,
  },
  escalas: { logo: 0.8 },
  carpetaVoz: CARPETA_VOZ_QUE_ES,
  hespo: 'semilla',
  aDos: true,
  // Original, sintetizada con scripts/generar_musica.py (modo «que-es»).
  musica: 'musica/que-es-hesperides.wav',
};

const Contenido: React.FC<{ linea: Linea; cajas: CajasDelMapa }> = ({ linea, cajas }) => {
  const frame = useCurrentFrame();
  return (
    <CajasContexto.Provider value={cajas}>
      <VideoBase linea={linea} config={CONFIG} />
      <Acabado linea={linea} frame={frame} />
    </CajasContexto.Provider>
  );
};

/** Quinto video: «¿Qué es Hesperides?», con Lucía, don Julio y el mapa 3D al atardecer. */
export const VideoQueEsHesperides: React.FC<PropsVideoQueEs> = ({ linea, cajas }) => (linea && cajas ? <Contenido linea={linea} cajas={cajas} /> : null);
