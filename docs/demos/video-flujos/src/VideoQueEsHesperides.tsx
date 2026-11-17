import React from 'react';
import { Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
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
import { Destello } from './queEs/destello';
import { CUADROS_TRANSICION_QUE_ES, pistasDeSonido, type Sonido } from './queEs/momentos';
import { CajasContexto, type CajasDelMapa } from './queEs/piezas';
import { CORTES, corteEntre } from './queEs/serie';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoQueEs = { linea: Linea | null; cajas: CajasDelMapa | null };

export const CARPETA_VOZ_QUE_ES = 'voz/que-es-hesperides';
export const COMANDO_CAPTURAS_QUE_ES = 'npx tsx scripts/capturas-que-es-hesperides.ts';
/** El logo queda 3 s en pantalla después de la última frase. */
export const FRAMES_COLA_QUE_ES = 90;
/** Efectos de sonido sintetizados por scripts/generar_sfx.py (npm run sfx). */
export const CARPETA_SFX = 'sfx';
export const SONIDOS: Sonido[] = ['barrido', 'clic', 'pop', 'campanita', 'golpe', 'papel'];

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
  transiciones: { cuadros: CUADROS_TRANSICION_QUE_ES, corte: corteEntre },
  // Original, sintetizada con scripts/generar_musica.py (modo «que-es»).
  musica: 'musica/que-es-hesperides.wav',
};

/** Destellos cálidos en los cortes clave: a mitad de la transición. */
const Destellos: React.FC<{ linea: Linea }> = ({ linea }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {linea.escenas.slice(1).map((e, i) => {
        const anterior = linea.escenas[i];
        return CORTES[`${anterior.id}>${e.id}`]?.destello ? <Destello key={e.id} frame={frame} corte={e.desde - CUADROS_TRANSICION_QUE_ES / 2} semilla={e.id} /> : null;
      })}
    </>
  );
};

/** Los efectos de sonido, cada uno en su cuadro y con su volumen (más bajo bajo la voz). */
const Efectos: React.FC<{ linea: Linea }> = ({ linea }) => (
  <>
    {pistasDeSonido(linea).map((p, i) => (
      <Sequence key={i} from={p.frame} durationInFrames={60} layout="none">
        <Html5Audio src={staticFile(`${CARPETA_SFX}/${p.sonido}.wav`)} volume={p.volumen} />
      </Sequence>
    ))}
  </>
);

const Contenido: React.FC<{ linea: Linea; cajas: CajasDelMapa }> = ({ linea, cajas }) => {
  const frame = useCurrentFrame();
  return (
    <CajasContexto.Provider value={cajas}>
      <VideoBase linea={linea} config={CONFIG} />
      <Destellos linea={linea} />
      <Acabado linea={linea} frame={frame} />
      <Efectos linea={linea} />
    </CajasContexto.Provider>
  );
};

/** Quinto video: «¿Qué es Hesperides?», con Lucía, don Julio y el mapa 3D al atardecer. */
export const VideoQueEsHesperides: React.FC<PropsVideoQueEs> = ({ linea, cajas }) => (linea && cajas ? <Contenido linea={linea} cajas={cajas} /> : null);
