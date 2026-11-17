// Las diecisiete escenas de «¿Qué es Hesperides?». Todo sale del cuadro y de los tiempos de la voz:
// cada momento se ancla a una fracción de su frase con `m`. Las personas van «a dos» (aDos) y
// la cámara y las pantallas «a uno».
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring } from 'remotion';
import type { PropsEscena } from '../escenas/tipos';
import { Campus, Tarjeta } from '../historia/escenas';
import { Arbol, ArbolRajado, Celular, Laptop, Lienzo, Sello, SUELO } from '../historia/decorado';
import { Persona, type PropsPersona } from '../historia/Persona';
import { Pulso } from '../pagina/Pulso';
import { Resalte } from '../pagina/Resalte';
import { COLOR } from '../tema';
import { FPS, type TramoEscena } from '../tiempos';
import { momentoDe } from '../ui/anim';
import { aDos, golpe, separacionCromatica, temblor } from './jugo';
import {
  AvisoCruce,
  Carpeta,
  Chip,
  Chispas,
  HojaDeCalculo,
  Logo,
  posicionDe,
  Retrato,
  Semana,
  Titulo,
  TomaMapa,
  Tuberia,
  useCajas,
} from './piezas';
import { centroDeGlobo } from './secuencia';

const suave = Easing.inOut(Easing.cubic);
/** Valor que pasa por varios puntos [cuadro, valor] con transiciones suaves. */
function tw(frame: number, puntos: [number, number][]): number {
  return interpolate(
    frame,
    puntos.map((p) => p[0]),
    puntos.map((p) => p[1]),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave },
  );
}
const m = (escena: TramoEscena, id: string, fraccion = 0) => momentoDe(escena, id, fraccion);
const fin = (escena: TramoEscena) => escena.desde + escena.frames;
const entre = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Una persona animada «a dos»: el dibujo cambia cada dos cuadros. */
const P: React.FC<PropsPersona> = (props) => <Persona {...props} frame={aDos(props.frame)} />;

/** Velo oscuro sobre el mapa para que se lean los títulos. */
const Velo: React.FC<{ fuerza?: number }> = ({ fuerza = 0.55 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,40,20,${fuerza}) 0%, rgba(10,40,20,${fuerza * 0.4}) 55%, rgba(0,0,0,0) 100%)` }} />
);

/** Oficina de Lucía: ventana al jardín, planta y escritorio. */
const Oficina: React.FC = () => (
  <Lienzo>
    <rect x={0} y={0} width={1920} height={940} fill={COLOR.barriga} />
    <rect x={0} y={780} width={1920} height={160} fill={COLOR.arena} />
    <rect x={110} y={110} width={420} height={320} rx={12} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={8} />
    <Arbol x={250} y={420} alto={220} />
    <Arbol x={420} y={420} alto={260} copa={COLOR.cuerpo} />
    <line x1={320} y1={110} x2={320} y2={430} stroke={COLOR.borde} strokeWidth={8} />
    <rect x={560} y={760} width={1260} height={30} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
    {/* Maceta sobre el escritorio */}
    <path d="M640 760 L652 700 L708 700 L720 760 Z" fill="#C8664B" stroke={COLOR.borde} strokeWidth={6} />
    <path d="M680 700 Q650 640 668 610 M680 700 Q700 630 724 620 M680 700 Q676 650 690 600" fill="none" stroke={COLOR.verde} strokeWidth={9} strokeLinecap="round" />
  </Lienzo>
);

const Lucia: React.FC<{ frame: number; x?: number; gesto?: PropsPersona['gesto']; brazoD?: number; miraX?: number; sentada?: boolean }> = ({
  frame,
  x = 420,
  gesto = 'feliz',
  brazoD = 60,
  miraX = 0.7,
  sentada = true,
}) => {
  const e = 1.1;
  const suelo = sentada ? 860 : SUELO + 4;
  return (
    <>
      {sentada ? (
        // La silla de Lucía: respaldo detrás de la espalda y asiento bajo la cadera.
        <svg width={1920} height={940} style={{ position: 'absolute', left: 0, top: 0 }}>
          <rect x={x - 72 * e} y={suelo - 250 * e} width={26 * e} height={170 * e} rx={10} fill={COLOR.verde} stroke={COLOR.borde} strokeWidth={6} />
          <rect x={x - 72 * e} y={suelo - 92 * e} width={150 * e} height={22 * e} rx={8} fill={COLOR.verde} stroke={COLOR.borde} strokeWidth={6} />
          <rect x={x - 6} y={suelo - 70 * e} width={12} height={70 * e} fill={COLOR.borde} />
          <rect x={x - 50 * e} y={suelo - 8} width={100 * e} height={10} rx={5} fill={COLOR.borde} />
        </svg>
      ) : null}
      <P quien="lucia" x={x} sueloY={suelo} escala={e} frame={frame} pose={{ brazoI: 30, brazoD, miraX }} gesto={gesto} sentado={sentada} />
    </>
  );
};

// ---------------- 1. ¿Qué es Hesperides? ----------------
export const QueEs: React.FC<PropsEscena> = ({ escena, frame }) => {
  const pos = posicionDe('vuelo', frame, escena.desde, 0.5);
  const q2 = m(escena, 'q2');
  const q3 = m(escena, 'q3');
  const sale = (hasta: number) => 1 - entre(frame, hasta - 8, hasta);
  return (
    <AbsoluteFill>
      <TomaMapa secuencia="vuelo" pos={pos} escala={tw(frame, [[escena.desde, 1.04], [fin(escena), 1.14]])} />
      <Velo />
      {frame < q2 ? (
        <div style={{ opacity: sale(q2) }}>
          <Titulo texto="¿Qué es Hesperides?" frame={frame} desde={m(escena, 'q1', 0.05)} y={330} tamano={130} />
        </div>
      ) : frame < q3 ? (
        <div style={{ opacity: sale(q3) }}>
          <Logo frame={frame} desde={q2} y={230} tamano={150} />
          <Titulo texto="Cuidar las áreas verdes, trabajando juntos." frame={frame} desde={m(escena, 'q2', 0.45)} y={460} tamano={58} color={COLOR.arena} />
        </div>
      ) : (
        <Titulo texto="¿Y cómo funciona?" frame={frame} desde={q3} y={360} tamano={120} />
      )}
    </AbsoluteFill>
  );
};

// ---------------- 2. Lucía ----------------
/** Dónde está cada quien en el mapa del campus (fracciones de la captura vuelo/060). */
const EQUIPO: { quien: PropsPersona['quien']; x: number; y: number; etiqueta: string }[] = [
  { quien: 'lucia', x: 560, y: 520, etiqueta: 'Lucía' },
  { quien: 'julio', x: 980, y: 400, etiqueta: 'Don Julio' },
  { quien: 'capataz2', x: 1380, y: 560, etiqueta: 'Capataz' },
  { quien: 'podador', x: 900, y: 760, etiqueta: 'Capataz' },
];

const CaraEnRetrato: React.FC<{ quien: PropsPersona['quien']; frame: number; diametro: number }> = ({ quien, frame, diametro }) => {
  const e = diametro / 250;
  return <P quien={quien} x={diametro / 2} sueloY={diametro * 0.5 + 292 * e} escala={e} frame={frame} pose={{ brazoI: 10, brazoD: 10 }} gesto="feliz" botas={quien === 'julio'} />;
};

export const LuciaEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q6 = m(escena, 'q6');
  const q8 = m(escena, 'q8');
  if (frame < q8) {
    const enPantalla = frame >= q6;
    return (
      <AbsoluteFill>
        <Oficina />
        <Laptop x={1280} y={140} ancho={960} captura="que-es/inicio" />
        <Lucia frame={frame} gesto={frame < m(escena, 'q5', 0.4) ? 'feliz' : 'neutral'} brazoD={enPantalla ? 85 : 55 + Math.sin(frame / 6) * 4} miraX={frame > m(escena, 'q5', 0.3) && frame < q6 ? -0.4 : 0.8} />
        {!enPantalla ? <Tarjeta texto="Lucía · coordinadora" visible={entre(frame, m(escena, 'q4', 0.1), m(escena, 'q4', 0.1) + 12)} x={70} y={40} /> : null}
        {enPantalla ? (
          <>
            <Tarjeta texto="Todas las áreas verdes de la PUCP" visible={entre(frame, q6, q6 + 12)} x={70} y={40} />
            <Chip texto="💧 Qué se riega" frame={frame} desde={m(escena, 'q7', 0.08)} x={820} y={60} />
            <Chip texto="✂️ Qué se poda" frame={frame} desde={m(escena, 'q7', 0.32)} x={1180} y={60} />
            <Chip texto="❗ Qué se atiende primero" frame={frame} desde={m(escena, 'q7', 0.6)} x={1000} y={680} fondo={COLOR.arena} color={COLOR.borde} />
          </>
        ) : null}
      </AbsoluteFill>
    );
  }
  // q8-q9: el equipo repartido por el campus.
  const pos = posicionDe('vuelo', frame, q8, 0.25, 120);
  const q9 = m(escena, 'q9');
  return (
    <AbsoluteFill>
      <TomaMapa secuencia="vuelo" pos={pos} escala={tw(frame, [[q8, 1.0], [fin(escena), 1.06]])} />
      <Velo fuerza={0.35} />
      {EQUIPO.map((p, i) => {
        const v = spring({ frame: frame - m(escena, 'q8', 0.35 + i * 0.12), fps: FPS, config: { damping: 10 } });
        const separa = entre(frame, q9, q9 + 30) * 50 * (i % 2 ? 1 : -1);
        return (
          <Retrato key={p.etiqueta + i} x={p.x + separa} y={p.y} diametro={150} visible={v} etiqueta={p.etiqueta}>
            <CaraEnRetrato quien={p.quien} frame={frame} diametro={150} />
          </Retrato>
        );
      })}
      <Tarjeta texto="Un equipo: tres capataces y sus cuadrillas" visible={entre(frame, m(escena, 'q8', 0.5), m(escena, 'q8', 0.5) + 12)} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 3. Don Julio ----------------
export const JulioEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const q11 = m(escena, 'q11');
  const x = tw(f2, [[escena.desde, -120], [q11, 760]]);
  const corrimiento = tw(f2, [[q11, 0], [fin(escena), 700]]);
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={corrimiento} frame={frame} />
        {[1250, 1700, 2150].map((ax, i) => (
          <g key={ax} transform={`translate(${-corrimiento} 0)`}>
            {Array.from({ length: 6 }, (_, k) => (
              <circle key={k} cx={ax - 80 + k * 32} cy={SUELO - 60 + (k % 2) * 8} r={13} fill={[COLOR.arena, COLOR.blanco, '#E7907A'][(k + i) % 3]} stroke={COLOR.borde} strokeWidth={4} />
            ))}
          </g>
        ))}
      </Lienzo>
      <P
        quien="julio"
        x={x}
        sueloY={SUELO + 4}
        escala={1}
        frame={frame}
        pose={{ brazoI: 12 + Math.sin(f2 / 5) * 8, brazoD: 40 }}
        gesto="feliz"
        objeto="pala"
        botas
        andar={{ distancia: x + corrimiento, w: 1 }}
      />
      <Tarjeta texto="Don Julio · capataz" visible={entre(frame, m(escena, 'q10', 0.1), m(escena, 'q10', 0.1) + 12)} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 4. El campus ----------------
export const CampusEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q15 = m(escena, 'q15');
  if (frame < q15) {
    const pos = posicionDe('vuelo', frame, escena.desde, 0.5, 140);
    return (
      <AbsoluteFill>
        <TomaMapa secuencia="vuelo" pos={pos} escala={tw(frame, [[escena.desde, 1.0], [q15, 1.12]])} foco={{ x: 1000, y: 560 }} />
        <Velo fuerza={0.3} />
        <Tarjeta texto="El campus de la PUCP" visible={entre(frame, m(escena, 'q13', 0.1), m(escena, 'q13', 0.1) + 12)} x={70} y={40} />
        <Chip texto="🌳 Cientos de jardines" frame={frame} desde={m(escena, 'q14', 0.02)} x={150} y={250} />
        <Chip texto="🌱 Miles de árboles y plantas" frame={frame} desde={m(escena, 'q14', 0.25)} x={600} y={400} />
        <Chip texto="📖 Cada uno con su historia" frame={frame} desde={m(escena, 'q14', 0.6)} x={1100} y={250} />
      </AbsoluteFill>
    );
  }
  // q15-q16: hojas de cálculo repartidas en carpetas y un mapa pintado a mano.
  const q16 = m(escena, 'q16');
  const desvanece = 1 - entre(frame, fin(escena) - 24, fin(escena));
  const hojas = [
    [260, 120, -8],
    [520, 200, 5],
    [380, 330, -3],
    [700, 110, 9],
    [620, 380, -10],
  ];
  const trazo = entre(frame, m(escena, 'q16', 0.1), m(escena, 'q16', 0.9));
  return (
    <AbsoluteFill style={{ background: COLOR.barriga, height: 940 }}>
      {hojas.map(([x, y, g], i) => {
        const cae = spring({ frame: frame - (q15 + i * 7), fps: FPS, config: { damping: 12 } });
        return frame >= q15 + i * 7 ? <HojaDeCalculo key={i} x={x} y={y - (1 - cae) * 300} giro={g} opacidad={Math.min(1, cae * 2) * desvanece} /> : null;
      })}
      {[0, 1, 2].map((i) => (
        <Carpeta key={i} x={180 + i * 260} y={700} opacidad={entre(frame, m(escena, 'q15', 0.5 + i * 0.12), m(escena, 'q15', 0.5 + i * 0.12) + 10) * desvanece} />
      ))}
      {/* El mapa de papel en que alguien lo pasaba a mano */}
      {frame >= q16 - 10 ? (
        <svg width={760} height={620} viewBox="0 0 760 620" style={{ position: 'absolute', left: 1080, top: 140, opacity: entre(frame, q16 - 10, q16 + 4) * desvanece, overflow: 'visible' }}>
          <rect x={10} y={10} width={740} height={600} rx={18} fill="#F4EEDC" stroke={COLOR.borde} strokeWidth={8} />
          {[
            [120, 140, 90],
            [330, 260, 120],
            [560, 160, 80],
            [520, 440, 110],
            [210, 450, 70],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r * Math.min(1, trazo * 5 - i * 0.6 > 0 ? 1 : 0)} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={5} opacity={0.85} />
          ))}
          <path d="M60 560 Q300 400 400 300 T720 80" fill="none" stroke={COLOR.borde} strokeWidth={7} strokeDasharray="1400" strokeDashoffset={1400 * (1 - trazo)} strokeLinecap="round" />
          {/* El lápiz que va dibujando */}
          <g transform={`translate(${60 + 660 * trazo} ${560 - 480 * trazo}) rotate(30)`}>
            <rect x={-10} y={-90} width={20} height={80} rx={4} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={4} />
            <path d="M-10 -10 L0 12 L10 -10 Z" fill={COLOR.borde} />
          </g>
        </svg>
      ) : null}
      <Tarjeta texto="Antes: hojas de cálculo y un mapa a mano" visible={entre(frame, q15 + 6, q15 + 18) * desvanece} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 5. La tubería ----------------
const X_TUBERIA = 1180;

export const TuberiaEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const q18 = m(escena, 'q18');
  const q19 = m(escena, 'q19');
  if (frame < q19) {
    const antes = frame >= q18;
    const x = tw(f2, [[escena.desde, -100], [m(escena, 'q17', 0.55), 760]]);
    const camina = f2 < m(escena, 'q17', 0.55) ? 1 : 0;
    const ve = frame > m(escena, 'q17', 0.6);
    const llamada = entre(frame, m(escena, 'q18', 0.15), m(escena, 'q18', 0.25));
    const perdida = entre(frame, m(escena, 'q18', 0.6), m(escena, 'q18', 1));
    return (
      <AbsoluteFill style={{ filter: antes ? `grayscale(${0.85 * entre(frame, q18, q18 + 10)}) sepia(${0.35 * entre(frame, q18, q18 + 10)})` : undefined }}>
        <Lienzo>
          <Campus corrimiento={300} amanecer={0.6} frame={frame} />
          <Tuberia x={X_TUBERIA} y={SUELO + 14} frame={frame} chorro={1} />
        </Lienzo>
        <P
          quien="julio"
          x={x}
          sueloY={SUELO + 4}
          escala={1}
          frame={frame}
          pose={{ brazoI: ve && !antes ? 60 : 12, brazoD: antes ? 150 : ve ? 60 : 30, miraX: 0.7, miraY: ve ? 0.3 : 0 }}
          gesto={antes ? 'preocupado' : ve ? 'sorpresa' : 'feliz'}
          objeto={antes ? 'celular' : 'pala'}
          botas
          andar={{ distancia: x, w: camina }}
        />
        {antes ? (
          <>
            <Tarjeta texto="Antes" visible={entre(frame, q18, q18 + 10)} x={70} y={40} />
            {/* Lo que se dijo por teléfono se va borrando */}
            <div
              style={{
                position: 'absolute',
                left: 860,
                top: 220,
                padding: '22px 34px',
                borderRadius: 30,
                background: COLOR.blanco,
                border: `6px solid ${COLOR.borde}`,
                fontSize: 40,
                fontWeight: 800,
                color: COLOR.borde,
                opacity: llamada * (1 - perdida),
                filter: `blur(${perdida * 8}px)`,
                transform: `translateY(${-perdida * 60}px)`,
              }}
            >
              «Aló… se rompió una tubería…»
            </div>
          </>
        ) : (
          <Tarjeta texto="Esta mañana" visible={entre(frame, m(escena, 'q17', 0.05), m(escena, 'q17', 0.05) + 12)} x={70} y={40} />
        )}
      </AbsoluteFill>
    );
  }
  // q19-q20: Hoy lo registra en Hesperides desde el celular.
  const q20 = m(escena, 'q20');
  const alto = 820;
  const k = (alto * 0.5 * 0.9) / 780;
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={300} frame={frame} />
        <Tuberia x={300} y={SUELO - 20} frame={frame} chorro={0.6} />
      </Lienzo>
      <P quien="julio" x={560} sueloY={SUELO + 4} escala={1.15} frame={frame} pose={{ brazoI: 10, brazoD: 120, miraX: 0.7 }} gesto="neutral" objeto="celular" botas />
      <Celular x={1060} y={50} alto={alto} captura="que-es/reporte-tuberia">
        {/* El recuadro «¿Qué pasó?», medido sobre la captura (780×1560) por su borde verde. */}
        <Resalte medida={{ x: 44 * k, y: 802 * k, ancho: 692 * k, alto: 256 * k }} visible={entre(frame, m(escena, 'q19', 0.35), m(escena, 'q19', 0.35) + 10)} />
      </Celular>
      <Tarjeta texto="Hoy" visible={entre(frame, q19, q19 + 10)} x={70} y={40} />
      {frame >= q20 ? (
        <>
          <Chip texto="📣 Reportar un problema" frame={frame} desde={m(escena, 'q20', 0.08)} x={1380} y={120} tamano={36} />
          <Chip texto="🤝 Pedir ayuda" frame={frame} desde={m(escena, 'q20', 0.3)} x={1380} y={230} tamano={36} />
          <Chip texto="📝 Dejar constancia" frame={frame} desde={m(escena, 'q20', 0.45)} x={1380} y={340} tamano={36} />
          <Chip texto="Urgencia: alta" frame={frame} desde={m(escena, 'q20', 0.78)} x={1380} y={470} tamano={36} fondo="#F6D3CB" color="#8A2D17" />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- 6. La bandeja de Lucía ----------------
export const BandejaEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q22 = m(escena, 'q22');
  const ancho = 1000;
  const k = ancho / 1920;
  const aprueba = m(escena, 'q22', 0.32);
  const cuadrilla = m(escena, 'q22', 0.62);
  return (
    <AbsoluteFill>
      <Oficina />
      {frame < q22 ? (
        <Laptop x={1260} y={130} ancho={ancho} captura="que-es/incidencias">
          <Pulso x={ancho * 0.45} y={ancho * 0.25} progreso={((frame - m(escena, 'q21', 0.2)) % 30) / 30} />
        </Laptop>
      ) : (
        <Laptop x={1260} y={130} ancho={ancho} captura="revision-aprobar">
          {/* «Aprobar registro» y «Cuadrilla responsable», medidos sobre la captura. */}
          <Resalte medida={{ x: 1193 * k, y: 618 * k, ancho: 274 * k, alto: 72 * k }} visible={entre(frame, aprueba - 10, aprueba)} />
          <Resalte medida={{ x: 1193 * k, y: 88 * k, ancho: 665 * k, alto: 104 * k }} visible={entre(frame, cuadrilla, cuadrilla + 10)} />
          <Pulso x={(1193 + 137) * k} y={(618 + 36) * k} progreso={(frame - aprueba) / 18} />
        </Laptop>
      )}
      <Lucia frame={frame} gesto={frame < m(escena, 'q21', 0.4) ? 'sorpresa' : 'feliz'} brazoD={frame >= q22 ? 90 : 60} />
      <Tarjeta texto="La bandeja de Lucía" visible={entre(frame, escena.desde + 4, escena.desde + 16)} x={70} y={40} />
      <Chip texto="✓ Aprobada" frame={frame} desde={aprueba + 4} x={760} y={60} />
      <Chip texto="👷 Cuadrilla elegida" frame={frame} desde={cuadrilla + 4} x={1060} y={60} />
    </AbsoluteFill>
  );
};

// ---------------- 7. Todo el campus pide atención ----------------
const Toldo: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <path d={`M${x - 160} ${y - 170} L${x} ${y - 240} L${x + 160} ${y - 170} Z`} fill="#C9B3E6" stroke={COLOR.borde} strokeWidth={6} strokeLinejoin="round" />
    <path d={`M${x - 160} ${y - 170} L${x + 160} ${y - 170}`} stroke={COLOR.borde} strokeWidth={6} />
    {[-150, 150].map((d) => (
      <rect key={d} x={x + d - 6} y={y - 170} width={12} height={170} fill={COLOR.borde} />
    ))}
    {[-90, -30, 30, 90].map((d) => (
      <rect key={d} x={x + d - 18} y={y - 60} width={36} height={60} rx={6} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={4} />
    ))}
  </g>
);

/** Puntos de actividad dibujados sobre el campus de la toma «vuelo». */
const PUNTOS_ACTIVIDAD: [number, number][] = [
  [760, 520],
  [980, 600],
  [1180, 480],
  [1300, 640],
  [880, 700],
];

export const ActividadEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q26 = m(escena, 'q26');
  if (frame < q26) {
    // El globo todavía no se cuenta (llega en la escena del globo): el recorrido va sin globos y
    // se aleja con la cámara; los puntos de actividad son dibujos sobre el campus.
    const pos = posicionDe('vuelo', frame, escena.desde, -0.5, 299);
    const lejos = tw(frame, [[escena.desde, 1.35], [m(escena, 'q25', 0.2), 1.0]]);
    return (
      <AbsoluteFill>
        <TomaMapa secuencia="vuelo" pos={pos} escala={lejos} foco={{ x: 1000, y: 560 }} />
        {frame > m(escena, 'q24', 0.3)
          ? PUNTOS_ACTIVIDAD.map(([x, y], i) => <Pulso key={i} x={x} y={y} progreso={((frame + i * 9) % 36) / 36} />)
          : null}
        <Tarjeta texto="No es el único jardín" visible={entre(frame, m(escena, 'q24', 0.1), m(escena, 'q24', 0.1) + 12)} x={70} y={40} />
        <Chip texto="💧 Por regar" frame={frame} desde={m(escena, 'q25', 0.25)} x={700} y={330} tamano={34} />
        <Chip texto="✂️ Poda pendiente" frame={frame} desde={m(escena, 'q25', 0.45)} x={1240} y={560} tamano={34} />
        <Chip texto="📅 Evento programado" frame={frame} desde={m(escena, 'q25', 0.65)} x={820} y={690} tamano={34} fondo="#E9DDF6" />
      </AbsoluteFill>
    );
  }
  // q26-q27: la vida del campus sigue mientras se repara la tubería.
  const f2 = aDos(frame);
  const q27 = m(escena, 'q27');
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={150} frame={frame} />
        <Toldo x={1500} y={SUELO - 30} />
        <Tuberia x={330} y={SUELO + 14} frame={frame} chorro={0.5} />
      </Lienzo>
      <P quien="podador" x={170} sueloY={SUELO + 6} escala={0.85} frame={frame} pose={{ brazoI: 20, brazoD: 100 + Math.sin(f2 / 3) * 14 }} gesto="neutral" objeto="llave" />
      {[0, 1, 2].map((i) => {
        const desde = q26 + i * 18;
        const x = 420 + (f2 - desde) * 5.5;
        return f2 > desde ? (
          <P key={i} quien={i === 1 ? 'peaton' : 'estudiante'} x={x} sueloY={SUELO + 10 - i * 4} escala={0.72} frame={frame} pose={{ brazoI: 10, brazoD: 12 }} gesto="feliz" andar={{ distancia: x, w: 1 }} ropa={[COLOR.hoja, COLOR.arena, '#9CC3E6'][i]} />
        ) : null;
      })}
      <Chip texto="🎓 Clases y eventos" frame={frame} desde={m(escena, 'q26', 0.15)} x={1280} y={120} tamano={34} />
      <Chip texto="🛠️ Trabajo en el jardín" frame={frame} desde={m(escena, 'q26', 0.35)} x={120} y={120} tamano={34} />
      <Tarjeta texto="Sin chocar con lo que pasa en el campus" visible={entre(frame, q27 + 4, q27 + 16)} x={560} y={260} />
    </AbsoluteFill>
  );
};

// ---------------- 8. El calendario ----------------
export const CalendarioEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q29 = m(escena, 'q29');
  const real = m(escena, 'q29', 0.56);
  if (frame < real) {
    const aviso = m(escena, 'q29', 0.4);
    return (
      <AbsoluteFill style={{ background: COLOR.barriga, height: 940 }}>
        <Semana x={300} y={200} frame={frame} tarea={tw(frame, [[m(escena, 'q29', 0.1), 0], [aviso, 1]])} aviso={entre(frame, aviso, aviso + 12)} marcas={entre(frame, m(escena, 'q28', 0.45), m(escena, 'q28', 0.45) + 12)} />
        <Tarjeta texto="Cada tarea, con el calendario" visible={entre(frame, escena.desde + 4, escena.desde + 16)} x={70} y={40} />
        <Chip texto="Feriados" frame={frame} desde={m(escena, 'q28', 0.5)} x={900} y={60} fondo={COLOR.arena} color={COLOR.borde} tamano={34} />
        <Chip texto="Eventos" frame={frame} desde={m(escena, 'q28', 0.62)} x={1140} y={60} fondo="#E9DDF6" color={COLOR.borde} tamano={34} />
        <Chip texto="Jardines prestados" frame={frame} desde={m(escena, 'q28', 0.75)} x={1350} y={60} tamano={34} />
        {frame >= q29 ? <AvisoCruce x={480} y={790} visible={entre(frame, aviso, aviso + 10)} /> : null}
      </AbsoluteFill>
    );
  }
  const ancho = 1240;
  const k = ancho / 1920;
  return (
    <AbsoluteFill style={{ background: COLOR.barriga, height: 940 }}>
      <Laptop x={960} y={70} ancho={ancho} captura="planificacion/intervencion-aviso-reserva">
        <Resalte medida={{ x: 470 * k, y: 680 * k, ancho: 1370 * k, alto: 74 * k }} visible={entre(frame, real + 8, real + 18)} />
      </Laptop>
      <Tarjeta texto="El aviso, antes de programar" visible={entre(frame, real, real + 12)} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 9. La cuadrilla trabaja ----------------
const PASOS_LINEA = [
  { texto: 'Reportó · don Julio', color: COLOR.arena },
  { texto: 'Aprobó · Lucía', color: COLOR.cuerpo },
  { texto: 'Reparación · cuadrilla', color: COLOR.hoja },
];

const LineaDeTiempo: React.FC<{ x: number; y: number; frame: number; desde: number[] }> = ({ x, y, frame, desde }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 520, padding: '22px 26px', borderRadius: 26, background: COLOR.blanco, border: `6px solid ${COLOR.borde}`, boxShadow: '0 12px 0 rgba(0,0,0,0.15)' }}>
    <div style={{ fontSize: 32, fontWeight: 800, color: COLOR.verde, marginBottom: 10 }}>Historia del jardín</div>
    {PASOS_LINEA.map((p, i) => {
      const v = spring({ frame: frame - desde[i], fps: FPS, config: { damping: 12 } });
      return (
        <div key={p.texto} style={{ display: 'flex', alignItems: 'center', gap: 16, height: 62, opacity: frame < desde[i] ? 0.15 : 1, transform: `translateX(${(1 - Math.min(1, v)) * 30}px)` }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: p.color, border: `5px solid ${COLOR.borde}` }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: COLOR.borde }}>{p.texto}</div>
        </div>
      );
    })}
  </div>
);

export const CuadrillaEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const repara = entre(frame, m(escena, 'q30', 0.3), m(escena, 'q31', 0.3));
  const ancho = 820;
  const k = ancho / 1920;
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={300} frame={frame} />
        <Tuberia x={560} y={SUELO - 20} frame={frame} chorro={1 - repara} reparada={repara} />
      </Lienzo>
      <P quien="podador" x={400} sueloY={SUELO + 6} escala={0.9} frame={frame} pose={{ brazoI: 25, brazoD: repara < 1 ? 105 + Math.sin(f2 / 2.5) * 14 : 20, inclina: 8 }} gesto="neutral" objeto="llave" />
      <P quien="podador" x={740} sueloY={SUELO + 6} escala={0.9} frame={frame} pose={{ brazoI: 15, brazoD: repara < 1 ? 70 : 140, miraX: -0.4 }} gesto={repara >= 1 ? 'feliz' : 'neutral'} objeto="pala" mira={-1} />
      <Laptop x={1430} y={40} ancho={ancho} captura="que-es/intervencion-historial">
        {/* «Validada» y «Ejecutada», medidos sobre la captura. */}
        <Resalte medida={{ x: 965 * k, y: 98 * k, ancho: 130 * k, alto: 38 * k }} visible={entre(frame, m(escena, 'q31', 0.15), m(escena, 'q31', 0.15) + 10)} />
        <Resalte medida={{ x: 1703 * k, y: 98 * k, ancho: 128 * k, alto: 38 * k }} visible={entre(frame, m(escena, 'q31', 0.3), m(escena, 'q31', 0.3) + 10)} />
      </Laptop>
      <LineaDeTiempo x={1170} y={500} frame={frame} desde={[m(escena, 'q31', 0.35), m(escena, 'q31', 0.5), m(escena, 'q31', 0.65)]} />
      <Tarjeta texto="La cuadrilla trabaja" visible={entre(frame, escena.desde + 4, escena.desde + 16)} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 10. El globo (momento clave) ----------------
/** El globo de la captura, recortado y escalado: así puede brotar o irse con rebote. */
const GloboRecortado: React.FC<{ pos: ReturnType<typeof posicionDe>; centro: { x: number; y: number }; escala: number }> = ({ pos, centro, escala }) => {
  const r = 85;
  if (escala <= 0.01) return null;
  return (
    <div style={{ position: 'absolute', left: centro.x - r, top: centro.y - r, width: r * 2, height: r * 2, borderRadius: '50%', overflow: 'hidden', transform: `scale(${escala})`, transformOrigin: '50% 80%' }}>
      <TomaMapaRecorte pos={pos} x={centro.x - r} y={centro.y - r} />
    </div>
  );
};

const TomaMapaRecorte: React.FC<{ pos: ReturnType<typeof posicionDe>; x: number; y: number }> = ({ pos, x, y }) => (
  <div style={{ position: 'absolute', left: -x, top: -y, width: 1920, height: 941 }}>
    <TomaMapa secuencia="globo" pos={pos} />
  </div>
);

/** Cámara del mapa con el golpe: anticipación, congelado, temblor, chispas y separación cromática. */
function golpeDeGlobo(escena: TramoEscena, frame: number, inicio: number, semilla: string) {
  const g = golpe(frame, inicio);
  // Durante el congelado la toma no avanza: se queda en el cuadro del golpe.
  const frameToma = g.congelado ? inicio : frame;
  const t = temblor(frame, inicio, semilla, 10);
  return { g, frameToma, t, cromatica: separacionCromatica(frame, inicio, 9) };
}

export const GloboEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const cajas = useCajas().globo ?? [];
  const aparece = m(escena, 'q32', 0.5);
  const { g, frameToma, t, cromatica } = golpeDeGlobo(escena, frame, aparece, 'globo-aparece');
  const ritmo = 0.62;
  const pos = posicionDe('globo', frameToma, escena.desde, ritmo);
  const centro = centroDeGlobo(cajas, pos) ?? { x: 900, y: 420 };
  const brote = frame < aparece ? 0 : spring({ frame: frame - aparece, fps: FPS, config: { damping: 7, stiffness: 180 } });
  const recortado = frame >= aparece && frame < aparece + 24;
  const sinGlobos = frame < aparece + 24 ? 1 : 0;
  const empuje = tw(frame, [[escena.desde, 1.0], [fin(escena), 1.1]]) * (1 - g.anticipa * 0.02);
  const q33 = m(escena, 'q33');
  const q34 = m(escena, 'q34');
  return (
    <AbsoluteFill style={{ transform: `translate(${t.x}px, ${t.y}px) rotate(${t.giro}deg)` }}>
      <TomaMapa secuencia="globo" pos={pos} escala={empuje} foco={centro} sinGlobos={sinGlobos} cromatica={cromatica}>
        {/* Antes del golpe, el suelo del jardín se carga de luz. */}
        {g.anticipa > 0 ? <div style={{ position: 'absolute', left: centro.x - 90, top: centro.y - 20, width: 180, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,255,255,0))', opacity: g.anticipa }} /> : null}
        {recortado ? <GloboRecortado pos={pos} centro={centro} escala={brote} /> : null}
        <Chispas x={centro.x} y={centro.y} frame={frame} inicio={aparece} semilla="globo-aparece" colores={['#E5483B', COLOR.arena, COLOR.blanco]} cuantas={12} />
      </TomaMapa>
      <Tarjeta texto="Aprobada: un globo en el mapa 3D" visible={entre(frame, aparece + 14, aparece + 26)} x={70} y={40} />
      {frame >= q33 && frame < q34 ? (
        <>
          <Chip texto="¿Qué está pasando?" frame={frame} desde={m(escena, 'q33', 0.08)} x={120} y={700} tamano={36} />
          <Chip texto="📍 ¿Dónde?" frame={frame} desde={m(escena, 'q33', 0.3)} x={620} y={700} tamano={36} />
          <Chip texto="¿Con qué urgencia? Alta" frame={frame} desde={m(escena, 'q33', 0.48)} x={940} y={700} tamano={36} fondo="#F6D3CB" color="#8A2D17" />
        </>
      ) : null}
      {frame >= q34 ? <EquipoMirando frame={frame} desde={q34} centro={{ x: (centro.x - 960) * empuje + 960, y: (centro.y - 470) * empuje + 470 }} /> : null}
    </AbsoluteFill>
  );
};

/** Todo el equipo mira el mismo globo: retratos en los bordes con una línea hasta él. */
const EquipoMirando: React.FC<{ frame: number; desde: number; centro: { x: number; y: number } }> = ({ frame, desde, centro }) => {
  const lugares = [
    { quien: 'lucia' as const, x: 170, y: 220 },
    { quien: 'julio' as const, x: 1750, y: 220 },
    { quien: 'capataz2' as const, x: 170, y: 760 },
    { quien: 'podador' as const, x: 1750, y: 760 },
  ];
  return (
    <>
      <svg width={1920} height={940} style={{ position: 'absolute', left: 0, top: 0 }}>
        {lugares.map((l, i) => {
          const v = entre(frame, desde + i * 5, desde + i * 5 + 14);
          return <line key={i} x1={l.x} y1={l.y} x2={l.x + (centro.x - l.x) * v} y2={l.y + (centro.y - l.y) * v} stroke={COLOR.blanco} strokeWidth={6} strokeDasharray="4 16" strokeLinecap="round" opacity={0.9} />;
        })}
      </svg>
      {lugares.map((l, i) => (
        <Retrato key={i} x={l.x} y={l.y} diametro={130} visible={spring({ frame: frame - desde - i * 5, fps: FPS, config: { damping: 10 } })}>
          <CaraEnRetrato quien={l.quien} frame={frame} diametro={130} />
        </Retrato>
      ))}
    </>
  );
};

// ---------------- 11. Otro capataz suma lo que vio ----------------
export const ObservacionEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const x = tw(f2, [[escena.desde, -100], [m(escena, 'q35', 0.3), 420]]);
  const alto = 800;
  const k = (alto * 0.5 * 0.9) / 780;
  const nota = m(escena, 'q35', 0.62);
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={420} frame={frame} />
        <ArbolRajado x={1000} y={SUELO - 30} frame={frame} alerta={entre(frame, m(escena, 'q35', 0.32), m(escena, 'q35', 0.4))} />
      </Lienzo>
      <P quien="capataz2" x={x} sueloY={SUELO + 4} escala={1} frame={frame} pose={{ brazoI: 10, brazoD: f2 > m(escena, 'q35', 0.45) ? 120 : 20, miraX: 0.6, miraY: -0.5 }} gesto={f2 > m(escena, 'q35', 0.32) ? 'pensativo' : 'neutral'} objeto="celular" botas andar={{ distancia: x, w: f2 < m(escena, 'q35', 0.3) ? 1 : 0 }} />
      <Celular x={1600} y={60} alto={alto} captura="que-es/otro-capataz-incidencia">
        {/* «Actualizar detalle», medido sobre la captura (780×1560). */}
        <Resalte medida={{ x: 75 * k, y: 541 * k, ancho: 381 * k, alto: 95 * k }} visible={entre(frame, m(escena, 'q35', 0.5), m(escena, 'q35', 0.5) + 10)} />
      </Celular>
      <Tarjeta texto="Otro capataz pasa por ahí" visible={entre(frame, escena.desde + 4, escena.desde + 16)} x={70} y={40} />
      <Chip texto="+ Lo que vio, al mismo trabajo" frame={frame} desde={nota} x={560} y={200} tamano={36} />
    </AbsoluteFill>
  );
};

// ---------------- 12. La historia del jardín ----------------
const ENTRADAS: { y: number; alto: number; chip: string }[] = [
  { y: 503, alto: 90, chip: 'Quién reportó' },
  { y: 316, alto: 60, chip: 'Quién aprobó' },
  { y: 731, alto: 90, chip: 'Quién trabajó' },
  { y: 845, alto: 90, chip: 'Y cuándo' },
];

export const HistorialEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const ancho = 1240;
  const k = ancho / 1920;
  return (
    <AbsoluteFill style={{ background: COLOR.barriga, height: 940 }}>
      <Laptop x={960} y={40} ancho={ancho} captura="incidencia-historial">
        {ENTRADAS.map((e, i) => {
          const desde = m(escena, 'q36', 0.06 + i * 0.13);
          const hasta = m(escena, 'q36', 0.06 + (i + 1) * 0.13);
          const v = i === ENTRADAS.length - 1 ? entre(frame, desde, desde + 8) : entre(frame, desde, desde + 8) * (1 - entre(frame, hasta, hasta + 8));
          return <Resalte key={i} medida={{ x: 440 * k, y: e.y * k, ancho: 690 * k, alto: e.alto * k }} visible={v} />;
        })}
      </Laptop>
      {ENTRADAS.map((e, i) => (
        <Chip key={e.chip} texto={e.chip} frame={frame} desde={m(escena, 'q36', 0.06 + i * 0.13)} x={150 + i * 420} y={760} tamano={36} />
      ))}
      <Tarjeta texto="Todo lo que pasó en ese jardín" visible={entre(frame, m(escena, 'q36', 0.65), m(escena, 'q36', 0.65) + 12)} x={70} y={30} />
    </AbsoluteFill>
  );
};

// ---------------- 13. Lucía cierra la incidencia ----------------
export const CierraEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const cajas = useCajas().globo ?? [];
  const q38 = m(escena, 'q38');
  if (frame < q38) {
    // q37: el sello «Cerrada» con su golpe.
    const sella = m(escena, 'q37', 0.62);
    const g = golpe(frame, sella);
    const t = temblor(frame, sella, 'sello', 12);
    const crom = separacionCromatica(frame, sella, 10);
    // Anticipación: el sello sube y se agranda; en el golpe se aplasta y se queda quieto 2 cuadros.
    const tiempoSello = frame < sella ? -1 : g.congelado ? 0 : g.tiempo / 8 + 0.25;
    const ancho = 1000;
    return (
      <AbsoluteFill style={{ transform: `translate(${t.x}px, ${t.y}px) rotate(${t.giro}deg)` }}>
        <Oficina />
        <Laptop x={1260} y={130} ancho={ancho} captura="incidencia-resuelta" />
        <Lucia frame={frame} gesto={frame >= sella ? 'feliz' : 'neutral'} brazoD={frame < sella - 6 ? 70 : frame < sella ? 120 + g.anticipa * 30 : 95} />
        <Tarjeta texto="Cuando el trabajo termina" visible={entre(frame, escena.desde + 4, escena.desde + 16)} x={70} y={40} />
        {frame >= sella - 4 && frame < sella ? (
          <div style={{ position: 'absolute', left: 1260, top: 380, transform: `translate(-50%, -50%) scale(${1.6 + g.anticipa * 0.5}) rotate(-8deg)`, opacity: 0.35 + g.anticipa * 0.4, padding: '14px 36px', border: `8px solid ${COLOR.verde}`, borderRadius: 20, color: COLOR.verde, fontSize: 64, fontWeight: 800 }}>
            ✓ Cerrada
          </div>
        ) : null}
        {crom > 0 ? (
          <>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
              <Sello x={1260 + crom} y={380} texto="Cerrada" t={Math.max(1, tiempoSello)} />
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35, filter: 'hue-rotate(180deg)' }}>
              <Sello x={1260 - crom} y={380} texto="Cerrada" t={Math.max(1, tiempoSello)} />
            </div>
          </>
        ) : null}
        {frame >= sella ? <Sello x={1260} y={380} texto="Cerrada" t={Math.max(1, tiempoSello)} /> : null}
        <Chispas x={1260} y={380} frame={frame} inicio={sella} semilla="sello" colores={[COLOR.hoja, COLOR.verde, COLOR.blanco]} cuantas={14} />
      </AbsoluteFill>
    );
  }
  const reporte = m(escena, 'q38', 0.5);
  if (frame < reporte) {
    // El globo se va del mapa: rebote hacia arriba, chispas y el jardín queda verde.
    const se = m(escena, 'q38', 0.12);
    const { frameToma, t } = golpeDeGlobo(escena, frame, se, 'globo-se-va');
    const pos = posicionDe('globo', frameToma, q38, 0.6, 210);
    const centro = centroDeGlobo(cajas, pos) ?? { x: 900, y: 400 };
    const salida = frame < se ? 1 : 1 + spring({ frame: frame - se, fps: FPS, config: { damping: 14 } }) * 0.3 - entre(frame, se + 4, se + 12) * 1.3;
    const verde = entre(frame, se, se + 20);
    return (
      <AbsoluteFill style={{ transform: `translate(${t.x * 0.6}px, ${t.y * 0.6}px)` }}>
        <TomaMapa secuencia="globo" pos={pos} sinGlobos={1} escala={1.06} foco={centro}>
          <div style={{ position: 'absolute', left: centro.x - 420, top: centro.y - 140, width: 840, height: 460, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(111,191,135,0.75), rgba(111,191,135,0))', mixBlendMode: 'overlay', opacity: verde }} />
          {salida > 0.02 ? <GloboRecortado pos={pos} centro={centro} escala={salida} /> : null}
          <Chispas x={centro.x} y={centro.y} frame={frame} inicio={se + 4} semilla="globo-se-va" colores={[COLOR.hoja, COLOR.blanco, COLOR.cuerpo]} cuantas={12} />
        </TomaMapa>
        <Tarjeta texto="El globo sale del mapa" visible={entre(frame, se + 10, se + 22)} x={70} y={40} />
      </AbsoluteFill>
    );
  }
  const ancho = 1240;
  const k = ancho / 1920;
  return (
    <AbsoluteFill style={{ background: COLOR.barriga, height: 940 }}>
      <Laptop x={960} y={70} ancho={ancho} captura="que-es/reporte-semanal-abajo">
        {/* «Incidencias abiertas», medida sobre la captura. */}
        <Resalte medida={{ x: 1500 * k, y: 228 * k, ancho: 330 * k, alto: 248 * k }} visible={entre(frame, reporte + 10, reporte + 20)} />
      </Laptop>
      <Tarjeta texto="Ya está en el reporte de la semana" visible={entre(frame, reporte, reporte + 12)} x={70} y={30} />
      <Chip texto="Cifras de demostración" frame={frame} desde={reporte + 6} x={1450} y={800} tamano={26} fondo={COLOR.arena} color={COLOR.borde} />
    </AbsoluteFill>
  );
};

// ---------------- 14. Un jardín sano ----------------
export const SanoEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const arco = (i: number) => {
    const fase = ((frame + i * 11) % 40) / 40;
    return <path key={i} d={`M${960} ${SUELO - 30} q${(i - 1) * 140} ${-180} ${(i - 1) * 280} ${0}`} fill="none" stroke="#8CC8E8" strokeWidth={6} strokeDasharray="10 18" strokeDashoffset={-fase * 112} opacity={0.8} />;
  };
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={300} frame={frame} />
        {[0, 1, 2].map(arco)}
        <circle cx={960} cy={SUELO - 30} r={14} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={5} />
        {/* Bancas del jardín */}
        {[
          [400, 420],
          [1200, 220],
        ].map(([bx, ancho]) => (
          <g key={bx}>
            <rect x={bx} y={SUELO - 82} width={ancho} height={20} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
            <rect x={bx + 16} y={SUELO - 62} width={12} height={60} fill={COLOR.borde} />
            <rect x={bx + ancho - 28} y={SUELO - 62} width={12} height={60} fill={COLOR.borde} />
          </g>
        ))}
        {Array.from({ length: 14 }, (_, k) => (
          <circle key={k} cx={300 + k * 100} cy={SUELO - 50 + (k % 3) * 10} r={12} fill={[COLOR.arena, COLOR.blanco, '#E7907A'][k % 3]} stroke={COLOR.borde} strokeWidth={4} />
        ))}
      </Lienzo>
      <P quien="estudiante" x={500} sueloY={SUELO + 20} escala={0.9} frame={frame} pose={{ brazoI: 20, brazoD: 60 + Math.sin(f2 / 8) * 10, miraX: 0.6 }} gesto="feliz" sentado ropa="#9CC3E6" />
      <P quien="peaton" x={720} sueloY={SUELO + 20} escala={0.9} frame={frame} pose={{ brazoI: 20, brazoD: 25, miraX: -0.6 }} gesto="feliz" sentado mira={-1} ropa={COLOR.arena} />
      <P quien="estudiante" x={1300} sueloY={SUELO + 20} escala={0.9} frame={frame} pose={{ brazoI: 15, brazoD: 30, miraX: -0.4 }} gesto="feliz" sentado mira={-1} ropa={COLOR.hoja} />
      <P quien="julio" x={1700} sueloY={SUELO} escala={0.8} frame={frame} pose={{ brazoI: 10, brazoD: 120 + Math.sin(f2 / 4) * 25 }} gesto="feliz" mira={-1} botas />
      <Tarjeta texto="Gracias al aviso de don Julio" visible={entre(frame, m(escena, 'q39', 0.45), m(escena, 'q39', 0.45) + 12)} x={70} y={40} />
    </AbsoluteFill>
  );
};

// ---------------- 15. Solo el comienzo ----------------
export const FuturoEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const q43 = m(escena, 'q43');
  const q44 = m(escena, 'q44');
  const todas = useCajas();
  const enFinal = frame >= q43;
  // Solo la vista lejana: de cerca se vería el globo que Lucía ya cerró.
  const pos = posicionDe('final', frame, escena.desde, 0.35);
  const cajas = todas.final ?? [];
  const capa = entre(frame, m(escena, 'q43', 0.05), m(escena, 'q43', 0.3));
  const globos = (cajas[pos.a] ?? []).filter((c) => c.y > 0 && c.y < 941);
  return (
    <AbsoluteFill>
      <TomaMapa secuencia="final" pos={pos} escala={tw(frame, [[escena.desde, 2.2], [q43, 1.2], [fin(escena), 1.0]])} foco={{ x: 1000, y: 500 }}>
        {/* Capa de datos: zonas de más atención (donde hay incidencias abiertas). */}
        {globos.map((c, i) => (
          <div key={i} style={{ position: 'absolute', left: c.x + c.ancho / 2 - 240, top: c.y + c.alto / 2 - 170, width: 480, height: 340, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(229,72,59,0.75), rgba(229,154,58,0.45) 45%, rgba(229,154,58,0) 72%)', opacity: capa * (0.8 + 0.2 * Math.sin((frame + i * 13) / 9)) }} />
        ))}
      </TomaMapa>
      <Velo fuerza={0.3} />
      <Tarjeta texto="Esto es solo el comienzo" visible={entre(frame, m(escena, 'q40', 0.1), m(escena, 'q40', 0.1) + 12) * (1 - entre(frame, q43 - 6, q43))} x={70} y={40} />
      {frame >= m(escena, 'q41') && frame < q43 ? (
        <>
          <Chip texto="💧 Cada riego" frame={frame} desde={m(escena, 'q41', 0.1)} x={150} y={200} tamano={34} />
          <Chip texto="✂️ Cada poda" frame={frame} desde={m(escena, 'q41', 0.3)} x={450} y={200} tamano={34} />
          <Chip texto="⚠ Cada problema" frame={frame} desde={m(escena, 'q41', 0.5)} x={740} y={200} tamano={34} />
          <Chip texto="📷 La foto completa" frame={frame} desde={m(escena, 'q42', 0.4)} x={420} y={330} tamano={40} fondo={COLOR.hoja} color={COLOR.borde} />
        </>
      ) : null}
      {enFinal && frame < q44 ? (
        <>
          <Chip texto="🔴 Zonas de más atención" frame={frame} desde={m(escena, 'q43', 0.15)} x={120} y={60} tamano={34} />
          <Chip texto="🌿 Qué especies crecen" frame={frame} desde={m(escena, 'q43', 0.45)} x={120} y={170} tamano={34} />
          <Chip texto="📈 Cómo cambian con el tiempo" frame={frame} desde={m(escena, 'q43', 0.7)} x={120} y={280} tamano={34} />
        </>
      ) : null}
      {frame >= q44 ? (
        <>
          <Chip texto="💬 El aviso de don Julio" frame={frame} desde={m(escena, 'q44', 0.05)} x={120} y={120} tamano={38} />
          <Chip texto="→ Mejores decisiones para todo el campus" frame={frame} desde={m(escena, 'q44', 0.45)} x={300} y={240} tamano={38} fondo={COLOR.hoja} color={COLOR.borde} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- 16. Juntos ----------------
export const JuntosEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const f2 = aDos(frame);
  const q46 = m(escena, 'q46');
  const q47 = m(escena, 'q47');
  const xEst = tw(f2, [[escena.desde, -120], [q47, 2050]]);
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={200} frame={frame} />
        {Array.from({ length: 12 }, (_, k) => (
          <circle key={k} cx={240 + k * 130} cy={SUELO - 52 + (k % 2) * 10} r={12} fill={[COLOR.arena, COLOR.blanco, '#E7907A'][k % 3]} stroke={COLOR.borde} strokeWidth={4} />
        ))}
      </Lienzo>
      {frame < q47 ? (
        <P quien="estudiante" x={xEst} sueloY={SUELO + 6} escala={0.95} frame={frame} pose={{ brazoI: 10, brazoD: 14 }} gesto="feliz" andar={{ distancia: xEst, w: 1 }} ropa="#9CC3E6" />
      ) : null}
      {frame < q46 ? <Titulo texto="¿Qué áreas verdes cuidas tú?" frame={frame} desde={m(escena, 'q45', 0.05)} y={160} tamano={90} color={COLOR.verde} sombra={false} /> : null}
      {frame >= q46 && frame < q47
        ? [
            { quien: 'lucia' as const, x: 420, etiqueta: 'Coordinas un equipo', f: 0.05 },
            { quien: 'julio' as const, x: 960, etiqueta: 'Trabajas en el campo', f: 0.35 },
            { quien: 'estudiante' as const, x: 1500, etiqueta: 'Cruzas un jardín', f: 0.65 },
          ].map((r) => (
            <Retrato key={r.quien} x={r.x} y={260} diametro={220} visible={spring({ frame: frame - m(escena, 'q46', r.f), fps: FPS, config: { damping: 10 } })} etiqueta={r.etiqueta}>
              <CaraEnRetrato quien={r.quien} frame={frame} diametro={220} />
            </Retrato>
          ))
        : null}
      {frame >= q47 ? (
        <>
          {[
            { quien: 'lucia' as const, x: 560 },
            { quien: 'julio' as const, x: 820 },
            { quien: 'capataz2' as const, x: 1080 },
            { quien: 'estudiante' as const, x: 1340 },
          ].map((p, i) => (
            <P key={p.quien} quien={p.quien} x={p.x} sueloY={SUELO + 6} escala={0.95} frame={frame} pose={{ brazoI: 10, brazoD: 110 + Math.sin((f2 + i * 7) / 4) * 20 }} gesto="feliz" botas={p.quien === 'julio' || p.quien === 'capataz2'} ropa="#9CC3E6" mira={i > 1 ? -1 : 1} />
          ))}
          <Titulo texto="Parte de la vida de todos" frame={frame} desde={q47 + 4} y={160} tamano={84} color={COLOR.verde} sombra={false} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- 17. Logo: juntos ----------------
export const LogoEscena: React.FC<PropsEscena> = ({ escena, frame }) => {
  const pos = posicionDe('final', frame, escena.desde, 0.5, 60);
  const q49 = m(escena, 'q49');
  const juntos = m(escena, 'q49', 0.62);
  return (
    <AbsoluteFill>
      <TomaMapa secuencia="final" pos={pos} escala={tw(frame, [[escena.desde, 1.08], [fin(escena) + 90, 1.0]])} />
      <Velo fuerza={0.6} />
      <Logo frame={frame} desde={m(escena, 'q48', 0.02)} y={190} tamano={160} />
      <Titulo texto="Es donde se cuidan." frame={frame} desde={m(escena, 'q48', 0.35)} y={420} tamano={56} color={COLOR.arena} />
      {frame >= q49 ? <Titulo texto="Juntos" frame={frame} desde={juntos} y={520} tamano={120} color={COLOR.blanco} /> : null}
      {/* Montículo de pasto donde brota Hespo */}
      <svg width={1920} height={940} style={{ position: 'absolute', left: 0, top: 0 }}>
        <ellipse cx={1500} cy={905} rx={260} ry={60} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={6} />
      </svg>
    </AbsoluteFill>
  );
};
