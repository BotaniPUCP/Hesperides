// Piezas del video «¿Qué es Hesperides?»: el mapa 3D grabado cuadro a cuadro, chispas de los
// golpes, la tubería rota, las hojas de cálculo, el calendario y las fichas de texto.
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Img, random, spring, staticFile } from 'remotion';
import { COLOR } from '../tema';
import { FPS } from '../tiempos';
import { particulas, separacionCromatica } from './jugo';
import { centroDeGlobo, posicionEnSecuencia, rutaCuadro, type CajaGlobo, type Posicion } from './secuencia';

export const ANCHO_ESCENA = 1920;
export const ALTO_ESCENA = 940;

/** Cuántas capturas tiene cada secuencia grabada por scripts/capturas-que-es-hesperides.ts. */
export const SECUENCIAS = { vuelo: 300, globo: 300, alejar: 75, final: 150 } as const;
export type Secuencia = keyof typeof SECUENCIAS;

/** Dónde quedó cada globo en cada captura (medidas.json de las capturas). */
export type CajasDelMapa = Partial<Record<Secuencia, CajaGlobo[][]>>;
export const CajasContexto = createContext<CajasDelMapa>({});
export const useCajas = () => useContext(CajasContexto);

export function posicionDe(secuencia: Secuencia, frame: number, desde: number, ritmo = 1, inicial = 0): Posicion {
  return posicionEnSecuencia(frame, desde, SECUENCIAS[secuencia], ritmo, inicial);
}

/** Centro del globo en coordenadas de la escena (la captura mide 1920×941). */
export function useGlobo(secuencia: Secuencia, pos: Posicion) {
  const cajas = useCajas()[secuencia] ?? [];
  return centroDeGlobo(cajas, pos);
}

const Captura: React.FC<{ ruta: string; opacidad?: number; estilo?: React.CSSProperties }> = ({ ruta, opacidad = 1, estilo }) =>
  opacidad > 0 ? <Img src={staticFile(ruta)} style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 941, opacity: opacidad, ...estilo }} /> : null;

/**
 * Una toma del mapa 3D: dos capturas vecinas mezcladas (la cámara va «a uno», sin saltos),
 * con un empuje suave de cámara (`escala`, centrado en `foco`) y, si hace falta, la misma toma
 * sin globos encima con opacidad `sinGlobos` (así un globo aparece o se va sin cortar la toma).
 */
export const TomaMapa: React.FC<{
  secuencia: Secuencia;
  pos: Posicion;
  escala?: number;
  foco?: { x: number; y: number };
  sinGlobos?: number;
  cromatica?: number;
  children?: React.ReactNode;
}> = ({ secuencia, pos, escala = 1, foco = { x: 960, y: 470 }, sinGlobos = 0, cromatica = 0, children }) => {
  const capa = (carpeta: string, opacidad = 1) => (
    <>
      <Captura ruta={rutaCuadro(carpeta, pos.a)} opacidad={opacidad} />
      {pos.mezcla > 0 ? <Captura ruta={rutaCuadro(carpeta, pos.b)} opacidad={opacidad * pos.mezcla} /> : null}
    </>
  );
  return (
    <AbsoluteFill style={{ overflow: 'hidden', height: ALTO_ESCENA, background: COLOR.borde }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 941, transform: `scale(${escala})`, transformOrigin: `${foco.x}px ${foco.y}px` }}>
        {capa(secuencia)}
        {sinGlobos > 0 && secuencia === 'globo' ? capa('globo-sin', sinGlobos) : null}
        {cromatica > 0 ? (
          <>
            <Captura ruta={rutaCuadro(secuencia, pos.a)} opacidad={0.28} estilo={{ left: cromatica, mixBlendMode: 'screen', filter: 'sepia(1) saturate(6) hue-rotate(-40deg)' }} />
            <Captura ruta={rutaCuadro(secuencia, pos.a)} opacidad={0.28} estilo={{ left: -cromatica, mixBlendMode: 'screen', filter: 'sepia(1) saturate(6) hue-rotate(170deg)' }} />
          </>
        ) : null}
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Chispas de un golpe, en coordenadas del contenedor. */
export const Chispas: React.FC<{ x: number; y: number; frame: number; inicio: number; semilla: string; colores?: string[]; cuantas?: number }> = ({
  x,
  y,
  frame,
  inicio,
  semilla,
  colores = [COLOR.hoja, COLOR.arena, COLOR.blanco],
  cuantas = 12,
}) => (
  <svg width={1920} height={941} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
    {particulas(frame, inicio, semilla, cuantas).map((p, i) => (
      <circle key={i} cx={x + p.x} cy={y + p.y} r={p.radio} fill={colores[Math.floor(p.tono * colores.length)]} stroke={COLOR.borde} strokeWidth={3} opacity={p.opacidad} />
    ))}
    {/* Anillo del impacto */}
    {frame >= inicio && frame < inicio + 14 ? (
      <circle cx={x} cy={y} r={30 + (frame - inicio) * 9} fill="none" stroke={COLOR.blanco} strokeWidth={8 * (1 - (frame - inicio) / 14)} opacity={1 - (frame - inicio) / 14} />
    ) : null}
  </svg>
);

export { separacionCromatica };

/** Ficha corta que aparece con un rebote: «Riego», «Poda»… */
export const Chip: React.FC<{ texto: string; frame: number; desde: number; x: number; y: number; fondo?: string; color?: string; tamano?: number; ancla?: 'izq' | 'centro' }> = ({
  texto,
  frame,
  desde,
  x,
  y,
  fondo = COLOR.blanco,
  color = COLOR.verde,
  tamano = 40,
  ancla = 'izq',
}) => {
  const s = spring({ frame: frame - desde, fps: FPS, config: { damping: 11, stiffness: 170 } });
  if (frame < desde) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${ancla === 'centro' ? '-50%' : '0'}, 0) scale(${0.6 + 0.4 * s})`,
        transformOrigin: 'left center',
        opacity: Math.min(1, s * 1.5),
        padding: '12px 26px',
        borderRadius: 999,
        background: fondo,
        color,
        fontSize: tamano,
        fontWeight: 800,
        border: `5px solid ${COLOR.borde}`,
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 0 rgba(0,0,0,0.12)',
      }}
    >
      {texto}
    </div>
  );
};

/** Título grande sobre la escena. */
export const Titulo: React.FC<{ texto: string; frame: number; desde: number; y?: number; tamano?: number; color?: string; sombra?: boolean }> = ({
  texto,
  frame,
  desde,
  y = 300,
  tamano = 120,
  color = COLOR.blanco,
  sombra = true,
}) => {
  const s = spring({ frame: frame - desde, fps: FPS, config: { damping: 12, stiffness: 140 } });
  if (frame < desde) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        textAlign: 'center',
        color,
        fontSize: tamano,
        fontWeight: 800,
        opacity: Math.min(1, s * 1.4),
        transform: `translateY(${(1 - s) * 30}px) scale(${0.85 + 0.15 * s})`,
        textShadow: sombra ? '0 6px 24px rgba(0,0,0,0.45)' : undefined,
      }}
    >
      {texto}
    </div>
  );
};

/** Logo: el nombre, como en la barra de la aplicación (no hay isotipo en docs/marca). */
export const Logo: React.FC<{ frame: number; desde: number; y?: number; tamano?: number }> = ({ frame, desde, y = 220, tamano = 150 }) => {
  const s = spring({ frame: frame - desde, fps: FPS, config: { damping: 10, stiffness: 120 } });
  if (frame < desde) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: tamano * 0.15, opacity: Math.min(1, s * 1.4), transform: `scale(${0.7 + 0.3 * s})` }}>
      <span style={{ fontSize: tamano, fontWeight: 800, color: COLOR.blanco, textShadow: '0 6px 24px rgba(0,0,0,0.45)' }}>Hesperides</span>
    </div>
  );
};

/** Retrato redondo de una persona para el mapa del equipo. */
export const Retrato: React.FC<{ x: number; y: number; diametro: number; visible: number; color?: string; children: React.ReactNode; etiqueta?: string }> = ({
  x,
  y,
  diametro,
  visible,
  color = COLOR.barriga,
  children,
  etiqueta,
}) =>
  visible > 0 ? (
    <div style={{ position: 'absolute', left: x - diametro / 2, top: y - diametro / 2, width: diametro, height: diametro, transform: `scale(${visible})`, transformOrigin: '50% 100%' }}>
      <div style={{ position: 'relative', width: diametro, height: diametro, borderRadius: '50%', overflow: 'hidden', background: color, border: `6px solid ${COLOR.borde}`, boxShadow: '0 10px 0 rgba(0,0,0,0.18)' }}>{children}</div>
      {etiqueta ? (
        <div style={{ position: 'absolute', left: diametro / 2, top: diametro + 8, transform: 'translateX(-50%)', fontSize: 28, fontWeight: 800, color: COLOR.borde, background: COLOR.blanco, borderRadius: 999, padding: '4px 16px', border: `4px solid ${COLOR.borde}`, whiteSpace: 'nowrap' }}>{etiqueta}</div>
      ) : null}
    </div>
  ) : null;

/** Tubería de riego en el pasto; `chorro` 0..1 es el agua que sale por la rajadura. */
export const Tuberia: React.FC<{ x: number; y: number; frame: number; chorro: number; reparada?: number }> = ({ x, y, frame, chorro, reparada = 0 }) => {
  const gotas = Array.from({ length: 22 }, (_, i) => {
    const vida = 24;
    const t = (frame + Math.floor(random(`g${i}`) * vida)) % vida;
    const ang = -Math.PI / 2 + (random(`ga${i}`) - 0.5) * 1.1;
    const v = 15 + random(`gv${i}`) * 10;
    return { px: x + Math.cos(ang) * v * t, py: y - 18 + Math.sin(ang) * v * t + 0.75 * t * t, r: 7 + random(`gr${i}`) * 8, o: 1 - t / vida };
  });
  return (
    <g>
      {/* Charco */}
      <ellipse cx={x} cy={y + 18} rx={60 + chorro * 120} ry={14 + chorro * 18} fill="#7FB8D6" opacity={0.55 * Math.max(chorro, 0.25 * (1 - reparada))} />
      <rect x={x - 300} y={y - 22} width={600} height={40} rx={20} fill="#9AA5A0" stroke={COLOR.borde} strokeWidth={6} />
      <rect x={x - 300} y={y - 14} width={600} height={8} rx={4} fill={COLOR.blanco} opacity={0.35} />
      {/* Rajadura o, ya reparada, la abrazadera nueva */}
      {reparada < 0.5 ? (
        <path d={`M${x - 14} ${y - 22} l10 14 l-8 8 l12 18`} fill="none" stroke={COLOR.borde} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <rect x={x - 36} y={y - 30} width={72} height={56} rx={10} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
      )}
      {chorro > 0
        ? gotas.map((g, i) => <circle key={i} cx={g.px} cy={g.py} r={g.r * chorro} fill="#8CC8E8" stroke={COLOR.borde} strokeWidth={2.5} opacity={g.o * chorro} />)
        : null}
    </g>
  );
};

/** Una hoja de cálculo genérica (sin marcas): encabezado verde y celdas. */
export const HojaDeCalculo: React.FC<{ x: number; y: number; giro: number; opacidad: number; escala?: number }> = ({ x, y, giro, opacidad, escala = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 420,
      height: 300,
      transform: `rotate(${giro}deg) scale(${escala})`,
      opacity: opacidad,
      background: COLOR.blanco,
      border: `5px solid ${COLOR.borde}`,
      borderRadius: 10,
      boxShadow: '0 12px 0 rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}
  >
    <div style={{ height: 34, background: COLOR.cuerpo, borderBottom: `4px solid ${COLOR.borde}` }} />
    {Array.from({ length: 8 }, (_, f) => (
      <div key={f} style={{ display: 'flex', height: 32, borderBottom: '2px solid #C9D6CE' }}>
        {Array.from({ length: 5 }, (_, c) => (
          <div key={c} style={{ flex: c === 0 ? 0.5 : 1, borderRight: '2px solid #C9D6CE', padding: '9px 8px' }}>
            <div style={{ height: 10, width: `${30 + random(`c${f}-${c}-${x}`) * 60}%`, background: c === 0 ? COLOR.cuerpo : '#B9C7BE', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/** Carpeta plana para las hojas repartidas. */
export const Carpeta: React.FC<{ x: number; y: number; opacidad: number }> = ({ x, y, opacidad }) => (
  <svg width={220} height={170} viewBox="0 0 220 170" style={{ position: 'absolute', left: x, top: y, opacity: opacidad, overflow: 'visible' }}>
    <path d="M10 30 L80 30 L96 48 L210 48 L210 160 L10 160 Z" fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={7} strokeLinejoin="round" />
    <path d="M10 64 L210 64" stroke={COLOR.borde} strokeWidth={5} />
  </svg>
);

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

/**
 * Semana del calendario (dibujo): el viernes tiene una ceremonia en el jardín. `tarea` (0..1)
 * lleva la tarjeta de trabajo hacia el viernes; `aviso` (0..1) enciende el aviso de cruce.
 */
export const Semana: React.FC<{ x: number; y: number; frame: number; tarea: number; aviso: number; marcas: number }> = ({ x, y, frame, tarea, aviso, marcas }) => {
  const anchoDia = 250;
  const tareaX = 40 + tarea * (anchoDia * 4 - 40 + 14);
  const tiembla = aviso > 0 && aviso < 1 ? Math.sin(frame * 2.2) * 6 * (1 - aviso) : 0;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: anchoDia * 5 + 40, height: 560, background: COLOR.blanco, border: `6px solid ${COLOR.borde}`, borderRadius: 28, boxShadow: '0 16px 0 rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', padding: '18px 20px 0' }}>
        {DIAS.map((d, i) => (
          <div key={d} style={{ width: anchoDia, textAlign: 'center', fontSize: 40, fontWeight: 800, color: i === 4 ? COLOR.verde : COLOR.borde }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, top: 84, bottom: 20, display: 'flex' }}>
        {DIAS.map((d, i) => (
          <div key={d} style={{ width: anchoDia, borderLeft: i ? '3px dashed #C9D6CE' : 'none', position: 'relative' }}>
            {i === 1 && marcas > 0 ? <Evento texto="Riego" color={COLOR.cuerpo} y={40} visible={marcas} /> : null}
            {i === 2 && marcas > 0 ? <Evento texto="Feriado" color={COLOR.arena} y={150} visible={marcas} /> : null}
            {i === 3 && marcas > 0 ? <Evento texto="Préstamo" color={COLOR.barriga} y={60} visible={marcas} /> : null}
            {i === 4 ? <Evento texto="Ceremonia" color="#C9B3E6" y={30} visible={1} alto={150} brillo={aviso} /> : null}
          </div>
        ))}
      </div>
      {/* La tarjeta de trabajo que se quiere programar */}
      <div
        style={{
          position: 'absolute',
          left: tareaX + tiembla,
          top: 330,
          width: anchoDia - 34,
          padding: '14px 16px',
          borderRadius: 16,
          background: COLOR.hoja,
          border: `5px solid ${COLOR.borde}`,
          color: COLOR.borde,
          fontSize: 30,
          fontWeight: 800,
          boxShadow: '0 10px 0 rgba(0,0,0,0.18)',
          transform: `rotate(${(1 - Math.min(1, tarea * 3)) * -4 + (tarea > 0 && tarea < 1 ? 3 : 0)}deg)`,
        }}
      >
        Reparar tubería
      </div>
    </div>
  );
};

const Evento: React.FC<{ texto: string; color: string; y: number; visible: number; alto?: number; brillo?: number }> = ({ texto, color, y, visible, alto = 90, brillo = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: 14,
      right: 14,
      top: y,
      height: alto,
      borderRadius: 16,
      background: color,
      border: `5px solid ${COLOR.borde}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 30,
      fontWeight: 800,
      color: COLOR.borde,
      opacity: visible,
      transform: `scale(${0.8 + 0.2 * visible})`,
      boxShadow: brillo > 0 ? `0 0 0 ${10 * brillo}px rgba(229,154,58,${0.6 * brillo})` : undefined,
    }}
  >
    {texto}
  </div>
);

/** Aviso de cruce al programar (dibujo del aviso; la pantalla real viene después). */
export const AvisoCruce: React.FC<{ x: number; y: number; visible: number }> = ({ x, y, visible }) =>
  visible > 0 ? (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        padding: '18px 30px',
        borderRadius: 20,
        background: '#FFF4D6',
        border: `6px solid #C98A1B`,
        color: '#7A4E00',
        fontSize: 36,
        fontWeight: 800,
        opacity: visible,
        transform: `translateY(${(1 - visible) * 30}px)`,
        boxShadow: '0 12px 0 rgba(0,0,0,0.15)',
      }}
    >
      ⚠ El viernes hay una ceremonia en este jardín
    </div>
  ) : null;
