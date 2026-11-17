import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { Acabado } from './historia/Acabado';
import { camaraEn, planosDeHistoria, transformarToma } from './historia/camara';
import { CapaDeGolpes } from './historia/Golpes';
import { cuadroConPausa, golpesDeHistoria, pausasDe } from './historia/impacto';
import type { ConfigVideo } from './escenas/componentes';
import { Aparece, Hoy, Manana, Resultado, Solucion } from './historia/escenas';
import { crearMedida, MedidasContexto, type Medidas } from './pagina/medidasCargadas';
import type { Linea } from './tiempos';
import { VideoBase } from './VideoBase';

export type PropsVideoHistoria = {
  linea: Linea | null;
  medidas: Medidas | null;
  /** Solo para revisar: deja la cámara quieta (mide el parpadeo sin el movimiento de cámara). */
  camaraQuieta?: boolean;
};

export const CARPETA_VOZ_HISTORIA = 'voz/historia';
/** El cierre queda 3 s en pantalla después de la última frase. */
export const FRAMES_COLA_HISTORIA = 90;

const BASE: ConfigVideo = {
  escenas: { manana: Manana, hoy: Hoy, aparece: Aparece, solucion: Solucion, resultado: Resultado },
  escalas: { aparece: 1.05, solucion: 0.75, resultado: 0.95 },
  carpetaVoz: CARPETA_VOZ_HISTORIA,
  hespo: 'semilla',
  // Original, sintetizada con scripts/generar_musica.py.
  musica: 'musica/historia.wav',
};

const Contenido: React.FC<{ linea: Linea; medidas: Medidas; camaraQuieta: boolean }> = ({ linea, medidas, camaraQuieta }) => {
  const medida = useMemo(() => crearMedida(medidas, 'npm run capturas:venta'), [medidas]);
  const frame = useCurrentFrame();
  const config = useMemo<ConfigVideo>(() => {
    const golpes = golpesDeHistoria(linea);
    const pausas = pausasDe(golpes);
    const planos = planosDeHistoria(linea, FRAMES_COLA_HISTORIA);
    const Capa: ConfigVideo['capaEscena'] = ({ frame: f, children }) => (
      <CapaDeGolpes golpes={golpes} frame={f} camara={camaraQuieta ? undefined : transformarToma(camaraEn(planos, f))}>
        {children}
      </CapaDeGolpes>
    );
    return { ...BASE, capaEscena: Capa, retiempo: (f) => cuadroConPausa(f, pausas) };
  }, [linea, camaraQuieta]);
  return (
    <MedidasContexto.Provider value={medida}>
      <VideoBase linea={linea} config={config} />
      <Acabado linea={linea} frame={frame} />
    </MedidasContexto.Provider>
  );
};

/** Cuarto video: la venta contada como historia, con Don Julio, el jefe y Hespo Semilla. */
export const VideoHistoria: React.FC<PropsVideoHistoria> = ({ linea, medidas, camaraQuieta = false }) =>
  linea && medidas ? <Contenido linea={linea} medidas={medidas} camaraQuieta={camaraQuieta} /> : null;
