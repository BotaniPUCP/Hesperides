// Decorados de la historia en SVG plano: campus, árbol de la rama rajada, oficina y objetos.
import React from 'react';
import { Img, random, staticFile } from 'remotion';
import { COLOR } from '../tema';
import { TrazoTinta } from './TrazosDeTinta';
import { rectRedondeado } from './tinta';

export const HORIZONTE = 640;
export const SUELO = 880;
const ALTO_ESCENA = 940;

/** Lienzo SVG del tamaño de la escena (sobre la banda de subtítulos). */
export const Lienzo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox={`0 0 1920 ${ALTO_ESCENA}`} width={1920} height={ALTO_ESCENA} style={{ position: 'absolute', left: 0, top: 0 }}>
    {children}
  </svg>
);

export const Cielo: React.FC<{ amanecer?: number }> = ({ amanecer = 0 }) => (
  <g>
    <defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={COLOR.barriga} />
        <stop offset="1" stopColor={amanecer > 0 ? COLOR.arena : COLOR.barriga} stopOpacity={0.4 + amanecer * 0.6} />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={1920} height={HORIZONTE + 20} fill={COLOR.barriga} />
    <rect x={0} y={0} width={1920} height={HORIZONTE + 20} fill="url(#cielo)" />
  </g>
);

export const Sol: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <circle cx={x} cy={y} r={110} fill={COLOR.blanco} opacity={0.35} />
    <circle cx={x} cy={y} r={70} fill={COLOR.blanco} opacity={0.9} />
  </g>
);

/** Edificios del campus a lo lejos, con ventanas (se hornean en la hoja «edificios»). */
export const Edificios: React.FC<{ corrimiento?: number }> = ({ corrimiento = 0 }) => (
  <g transform={`translate(${-corrimiento * 0.5} 0)`}>
    {[
      { x: 120, w: 260, h: 170 },
      { x: 420, w: 180, h: 230 },
      { x: 1260, w: 300, h: 190 },
      { x: 1620, w: 220, h: 150 },
      { x: 2000, w: 260, h: 210 },
    ].map((e, i) => (
      <g key={i}>
        <rect x={e.x} y={HORIZONTE - e.h} width={e.w} height={e.h} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={4} />
        {Array.from({ length: Math.floor(e.w / 50) * Math.floor(e.h / 55) }, (_, k) => {
          const col = k % Math.floor(e.w / 50);
          const fila = Math.floor(k / Math.floor(e.w / 50));
          return <rect key={k} x={e.x + 18 + col * 50} y={HORIZONTE - e.h + 18 + fila * 55} width={26} height={30} rx={3} fill={COLOR.barriga} />;
        })}
      </g>
    ))}
  </g>
);

/** Árbol de copa redonda con contorno; `vaiven` en grados. */
export const Arbol: React.FC<{ x: number; y: number; alto: number; copa?: string; vaiven?: number }> = ({ x, y, alto, copa = COLOR.hoja, vaiven = 0 }) => {
  const r = alto * 0.32;
  return (
    <g transform={`rotate(${vaiven} ${x} ${y})`}>
      <path d={`M${x - alto * 0.05} ${y} L${x - alto * 0.03} ${y - alto * 0.55} L${x + alto * 0.03} ${y - alto * 0.55} L${x + alto * 0.05} ${y} Z`} fill={COLOR.borde} />
      <g stroke={COLOR.borde} strokeWidth={5} fill={copa}>
        <circle cx={x - r * 0.6} cy={y - alto * 0.62} r={r * 0.8} />
        <circle cx={x + r * 0.6} cy={y - alto * 0.62} r={r * 0.8} />
        <circle cx={x} cy={y - alto * 0.8} r={r} />
      </g>
      <g fill={copa}>
        <circle cx={x - r * 0.6} cy={y - alto * 0.62} r={r * 0.8 - 2.5} />
        <circle cx={x + r * 0.6} cy={y - alto * 0.62} r={r * 0.8 - 2.5} />
      </g>
      <circle cx={x - r * 0.35} cy={y - alto * 0.88} r={r * 0.28} fill={COLOR.blanco} opacity={0.25} />
    </g>
  );
};

/** Escritorio vivo (encima van objetos que se animan) con sombra dura, como una hoja más. */
export const Escritorio: React.FC<{ x: number; y: number; ancho: number; patas?: number }> = ({ x, y, ancho, patas = 0 }) => (
  <g>
    <rect x={x + 4} y={y + 6} width={ancho} height={32} rx={8} fill={COLOR.borde} opacity={0.25} />
    {patas > 0 ? (
      <g fill={COLOR.borde}>
        <rect x={x + 40} y={y + 34} width={20} height={patas} />
        <rect x={x + ancho - 60} y={y + 34} width={20} height={patas} />
      </g>
    ) : null}
    <rect x={x} y={y} width={ancho} height={32} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
  </g>
);

export const Farol: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <rect x={x - 5} y={y - 210} width={10} height={210} fill={COLOR.borde} />
    <rect x={x - 18} y={y - 236} width={36} height={30} rx={8} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={5} />
  </g>
);

/**
 * El árbol de la rama rajada: la rama sale sobre el sendero, se mece y tiene una grieta.
 * `alerta` (0..1) hace latir un aviso; `corte` (0..1) la desprende y la deja caer.
 */
export const ArbolRajado: React.FC<{ x: number; y: number; frame: number; alerta: number; corte?: number }> = ({ x, y, frame, alerta, corte = 0 }) => {
  const base = { x: x - 40, y: y - 330 };
  // La rama se mece solo cuando importa: con el aviso o mientras la cortan (sin vaivén ocioso).
  const meneo = Math.max(alerta, corte > 0 && corte < 1 ? 1 : 0);
  const vaiven = Math.sin(frame / 9) * 2.5 * (1 - corte) * meneo;
  // Cae: la punta se hunde mientras se suelta y la rama aterriza casi plana sobre el sendero.
  const caida = corte * corte * 300;
  const giro = vaiven - Math.sin(Math.PI * Math.min(1, corte)) * 35;
  return (
    <g>
      <path d={`M${x - 46} ${y} Q${x - 30} ${y - 200} ${x - 36} ${y - 420} L${x + 36} ${y - 420} Q${x + 26} ${y - 200} ${x + 46} ${y} Z`} fill={COLOR.borde} />
      <g stroke={COLOR.borde} strokeWidth={6} fill={COLOR.hoja}>
        <circle cx={x - 110} cy={y - 470} r={120} />
        <circle cx={x + 110} cy={y - 480} r={130} />
        <circle cx={x} cy={y - 580} r={150} />
      </g>
      <g fill={COLOR.hoja}>
        <circle cx={x - 110} cy={y - 470} r={116} />
        <circle cx={x + 110} cy={y - 480} r={126} />
      </g>
      {/* La rama rajada, sobre el sendero */}
      <g transform={`translate(0 ${caida}) rotate(${giro} ${base.x} ${base.y})`}>
        <path d={`M${base.x} ${base.y} Q${base.x - 220} ${base.y - 30} ${base.x - 420} ${base.y + 20}`} fill="none" stroke={COLOR.borde} strokeWidth={26} strokeLinecap="round" />
        <g stroke={COLOR.borde} strokeWidth={5} fill={COLOR.cuerpo}>
          <circle cx={base.x - 400} cy={base.y + 10} r={56} />
          <circle cx={base.x - 300} cy={base.y - 30} r={46} />
        </g>
        <path d={`M${base.x - 28} ${base.y - 14} l-10 12 l12 6 l-10 14`} fill="none" stroke={COLOR.blanco} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {alerta > 0 ? (
        <g opacity={alerta}>
          <circle cx={base.x - 40} cy={base.y - 70} r={30 + Math.sin(frame / 3) * 5} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={5} />
          <text x={base.x - 40} y={base.y - 56} textAnchor="middle" fontSize={44} fontWeight={800} fill={COLOR.borde}>
            !
          </text>
        </g>
      ) : null}
    </g>
  );
};

/** Opacidad del cuerpo de un aparato mientras su contorno se dibuja: aparece en la segunda mitad. */
const rellenoTrasTrazo = (dibujo: number) => Math.min(1, Math.max(0, (dibujo - 0.45) / 0.45));

/**
 * Celular dibujado con una captura real dentro. Con `dibujo` (0 a 1) el contorno se traza en tinta
 * y el cuerpo aparece detrás.
 */
export const Celular: React.FC<{ x: number; y: number; alto: number; captura?: string; children?: React.ReactNode; inclina?: number; dibujo?: number; tinta?: string }> = ({ x, y, alto, captura, children, inclina = 0, dibujo = 1, tinta = COLOR.borde }) => {
  const ancho = alto * 0.5;
  const relleno = rellenoTrasTrazo(dibujo);
  return (
    <div style={{ position: 'absolute', left: x - ancho / 2, top: y, width: ancho, height: alto, transform: `rotate(${inclina}deg)` }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: alto * 0.07, background: COLOR.borde, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', opacity: relleno }}>
        <div style={{ position: 'absolute', left: ancho * 0.05, top: alto * 0.045, right: ancho * 0.05, bottom: alto * 0.045, borderRadius: alto * 0.045, overflow: 'hidden', background: COLOR.blanco }}>
          {captura ? <Img src={staticFile(`capturas/${captura}.png`)} style={{ width: '100%' }} /> : null}
          {children}
        </div>
      </div>
      {dibujo < 1 ? (
        <svg width={ancho} height={alto} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <TrazoTinta puntos={rectRedondeado(-4, -4, ancho + 8, alto + 8, alto * 0.07 + 4)} progreso={Math.min(1, dibujo / 0.8)} semilla={`celular-${captura ?? 'chat'}`} ancho={8} color={tinta} />
        </svg>
      ) : null}
    </div>
  );
};

/**
 * Laptop dibujada con una captura real en la pantalla (proporción 1920×941). Con `dibujo` (0 a 1)
 * primero se trazan la pantalla y la base en tinta, y el cuerpo aparece detrás.
 */
export const Laptop: React.FC<{ x: number; y: number; ancho: number; captura: string; children?: React.ReactNode; dibujo?: number }> = ({ x, y, ancho, captura, children, dibujo = 1 }) => {
  // Medidas enteras: el recorte de la pantalla cae en píxeles exactos y se dibuja igual en cada render.
  const altoPantalla = Math.round((ancho * 941) / 1920);
  const marco = Math.round(ancho * 0.025);
  const relleno = rellenoTrasTrazo(dibujo);
  const anchoTotal = ancho + marco * 2;
  const altoTotal = altoPantalla + marco * 2;
  const base = { x: -ancho * 0.09 + marco - marco, y: altoTotal, w: ancho * 1.18, h: marco * 1.6 };
  return (
    <div style={{ position: 'absolute', left: x - ancho / 2 - marco, top: y }}>
      <div style={{ opacity: relleno }}>
        <div style={{ width: anchoTotal, height: altoTotal, background: COLOR.borde, borderRadius: marco * 1.2, position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          <div style={{ position: 'absolute', left: marco, top: marco, width: ancho, height: altoPantalla, overflow: 'hidden', background: COLOR.blanco }}>
            <Img src={staticFile(`capturas/${captura}.png`)} style={{ width: ancho, height: altoPantalla }} />
            {children}
          </div>
        </div>
        <div style={{ width: ancho * 1.18, height: marco * 1.6, marginLeft: -ancho * 0.09 + marco, background: COLOR.borde, borderRadius: `0 0 ${marco * 2}px ${marco * 2}px` }} />
      </div>
      {dibujo < 1 ? (
        <svg width={anchoTotal} height={altoTotal} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <TrazoTinta puntos={rectRedondeado(-4, -4, anchoTotal + 8, altoTotal + 8, marco * 1.2 + 4)} progreso={Math.min(1, dibujo / 0.7)} semilla="laptop-pantalla" ancho={8} />
          <TrazoTinta puntos={rectRedondeado(base.x + marco - 4, base.y - 2, base.w + 8, base.h + 6, 6)} progreso={Math.max(0, Math.min(1, (dibujo - 0.45) / 0.45))} semilla="laptop-base" ancho={7} />
        </svg>
      ) : null}
    </div>
  );
};

/** Burbuja de chat genérica (sin marcas). */
export const Burbuja: React.FC<{ texto: string; mia?: boolean; y: number; foto?: boolean }> = ({ texto, mia = false, y, foto = false }) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      [mia ? 'right' : 'left']: 18,
      maxWidth: '78%',
      padding: '12px 18px',
      borderRadius: 22,
      background: mia ? COLOR.hoja : COLOR.blanco,
      color: COLOR.borde,
      fontSize: 26,
      fontWeight: 700,
      boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
    }}
  >
    {foto ? <div style={{ width: 200, height: 120, borderRadius: 12, background: COLOR.cuerpo, marginBottom: 8, border: `4px solid ${COLOR.borde}` }} /> : null}
    {texto}
  </div>
);

/** Sello que cae con aplastamiento: «Cerrada». */
export const Sello: React.FC<{ x: number; y: number; texto: string; t: number }> = ({ x, y, texto, t }) => {
  if (t <= 0) return null;
  const escala = t < 1 ? 2.2 - 1.2 * t : 1 + Math.sin(Math.min(1, (t - 1) * 3) * Math.PI) * 0.08;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${escala}) rotate(-8deg)`,
        padding: '14px 36px',
        border: `8px solid ${COLOR.verde}`,
        borderRadius: 20,
        color: COLOR.verde,
        background: 'rgba(255,255,255,0.92)',
        fontSize: 64,
        fontWeight: 800,
        opacity: Math.min(1, t * 2),
      }}
    >
      ✓ {texto}
    </div>
  );
};

/** Tierra que salta cuando algo brota del suelo. */
export const Tierra: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t < 0 || t > 24) return null;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={70} ry={14} fill={COLOR.borde} opacity={0.5 * (1 - t / 24)} />
      {Array.from({ length: 12 }, (_, i) => {
        const ang = -Math.PI * (0.1 + 0.8 * random(`ta${i}`));
        const v = 9 + random(`tv${i}`) * 9;
        const px = x + Math.cos(ang) * v * t;
        const py = y + Math.sin(ang) * v * t + 0.9 * t * t;
        return <circle key={i} cx={px} cy={py} r={4 + random(`tr${i}`) * 6} fill={i % 3 ? COLOR.borde : COLOR.arena} opacity={1 - t / 24} />;
      })}
    </g>
  );
};
