// Las cinco escenas de la historia de Don Julio. Todo sale del cuadro y de los tiempos de la voz.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring } from 'remotion';
import type { PropsEscena } from '../escenas/tipos';
import { ESPERA_BROTE } from '../hespo2d/semillaEnGuion';
import { useMedida } from '../pagina/medidasCargadas';
import { Pulso } from '../pagina/Pulso';
import { Resalte } from '../pagina/Resalte';
import { ALTO, BANDA, COLOR } from '../tema';
import { FPS } from '../tiempos';
import { apareceEn, momentoDe } from '../ui/anim';
import { Arbol, ArbolRajado, Burbuja, Celular, Cielo, Colinas, Edificios, Farol, HORIZONTE, Laptop, Lienzo, Sello, Sol, SUELO, Suelo, Tierra } from './decorado';
import { Persona } from './Persona';

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

const Tarjeta: React.FC<{ texto: string; visible: number; x?: number; y?: number }> = ({ texto, visible, x = 60, y = 50 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      padding: '14px 28px',
      borderRadius: 18,
      background: COLOR.blanco,
      color: COLOR.verde,
      fontSize: 42,
      fontWeight: 800,
      border: `5px solid ${COLOR.borde}`,
      opacity: visible,
      transform: `translateY(${(1 - visible) * 20}px)`,
    }}
  >
    {texto}
  </div>
);

/** El campus con paneo de cámara. */
const Campus: React.FC<{ corrimiento: number; amanecer?: number; frame: number }> = ({ corrimiento, amanecer = 0, frame }) => (
  <>
    <Cielo amanecer={amanecer} />
    {amanecer > 0 ? <Sol x={1500 - corrimiento * 0.1} y={tw(amanecer, [[0, 160], [1, 470]])} /> : <Sol x={1640} y={150} />}
    <Colinas corrimiento={corrimiento} />
    <Edificios corrimiento={corrimiento} />
    <Suelo />
    <g transform={`translate(${-corrimiento * 0.8} 0)`}>
      {[180, 520, 1040, 2150].map((x, i) => (
        <Arbol key={x} x={x} y={HORIZONTE + 70} alto={260 + (i % 2) * 60} copa={i % 2 ? COLOR.cuerpo : COLOR.hoja} vaiven={Math.sin((frame + i * 13) / 30) * 1.2} />
      ))}
      <Farol x={880} y={SUELO - 30} />
    </g>
  </>
);

// ---------------- 1. Mañana ----------------
export const Manana: React.FC<PropsEscena> = ({ escena, frame }) => {
  const h1 = momentoDe(escena, 'h1', 0);
  const h2 = momentoDe(escena, 'h2', 0);
  const fin = escena.desde + escena.frames;
  const corrimiento = tw(frame, [
    [h1, 0],
    [fin, 300],
  ]);
  const amanecer = tw(frame, [
    [h1, 0],
    [h2, 1],
  ]);
  const xJulio = tw(frame, [
    [h1, -160],
    [momentoDe(escena, 'h1', 0.85), 680],
  ]);
  const caminando = frame < momentoDe(escena, 'h1', 0.85) ? 1 : 0;
  const mira = tw(frame, [
    [momentoDe(escena, 'h2', 0.2), 0],
    [momentoDe(escena, 'h2', 0.35), 1],
  ]);
  const alerta = apareceEn(escena, 'h2', frame, 0.4);
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={corrimiento} amanecer={amanecer} frame={frame} />
        <ArbolRajado x={1650 - corrimiento} y={SUELO - 30} frame={frame} alerta={alerta} />
      </Lienzo>
      {/* Peatones que pasan bajo la rama */}
      {[0, 1].map((i) => {
        const desde = momentoDe(escena, 'h2', 0.35 + i * 0.15);
        const x = 2000 - (frame - desde) * 7;
        return frame > desde ? (
          <Persona key={i} quien="peaton" x={x} sueloY={SUELO + 6} escala={0.62} frame={frame} pose={{ brazoI: 8, brazoD: 8 }} mira={-1} andar={{ distancia: (frame - desde) * 7, w: 1 }} ropa={i ? COLOR.arena : COLOR.blanco} />
        ) : null;
      })}
      <Persona
        quien="julio"
        x={xJulio}
        sueloY={SUELO + 4}
        escala={0.95}
        frame={frame}
        pose={{ brazoI: 10, brazoD: 10 + mira * 30, miraY: -0.8 * mira, miraX: 0.6 * mira }}
        gesto={frame < momentoDe(escena, 'h2', 0.3) ? 'feliz' : mira > 0.5 ? 'preocupado' : 'neutral'}
        andar={{ distancia: xJulio, w: caminando }}
      />
      <Tarjeta texto="6:00 a. m." visible={apareceEn(escena, 'h1', frame, 0.05)} />
    </AbsoluteFill>
  );
};

// ---------------- 2. Hoy ----------------
const MENSAJES = ['¡Buenos días, equipo!', 'Ok 👍', '¿Quién tiene la llave del almacén?', 'Feliz cumpleaños, Rosa 🎉', 'Llego en 10', 'Gracias', '¿Hay reunión hoy?', 'Sí, a las 3', 'Ok', 'Buen día'];

const Chat: React.FC<{ frame: number; mio: number; inicioLluvia: number }> = ({ frame, mio, inicioLluvia }) => {
  const llegados = frame < inicioLluvia ? 0 : Math.min(MENSAJES.length, Math.floor((frame - inicioLluvia) / 5));
  const altoMio = 250;
  const altoOtro = 76;
  const total = 120 + altoMio + llegados * altoOtro;
  const visible = 640;
  const scroll = Math.max(0, total - visible);
  return (
    <div style={{ position: 'absolute', inset: 0, background: COLOR.barriga }}>
      <div style={{ height: 70, background: COLOR.verde, color: COLOR.blanco, fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', paddingLeft: 24 }}>Grupo Áreas Verdes</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, bottom: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: -scroll }}>
          <Burbuja texto="Buenos días" y={20} />
          {mio > 0 ? <Burbuja texto="Rama rajada sobre el sendero, ojo" mia foto y={110} /> : null}
          {MENSAJES.slice(0, llegados).map((m, i) => (
            <Burbuja key={i} texto={m} y={120 + altoMio + i * altoOtro} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const Hoy: React.FC<PropsEscena> = ({ escena, frame }) => {
  const h4 = momentoDe(escena, 'h4', 0);
  const h5 = momentoDe(escena, 'h5', 0);
  if (frame < h4) {
    // h3: el mensaje se pierde entre cientos.
    return (
      <AbsoluteFill style={{ background: COLOR.verde, height: ALTO - BANDA }}>
        <Persona
          quien="julio"
          x={460}
          sueloY={SUELO + 30}
          escala={1.35}
          frame={frame}
          pose={{ brazoI: 10, brazoD: 120, miraX: 0.6, miraY: -0.2 }}
          gesto={frame < momentoDe(escena, 'h3', 0.6) ? 'neutral' : 'preocupado'}
          objeto="celular"
        />
        <Celular x={1180} y={60} alto={800}>
          <Chat frame={frame} mio={apareceEn(escena, 'h3', frame, 0.15)} inicioLluvia={momentoDe(escena, 'h3', 0.42)} />
        </Celular>
      </AbsoluteFill>
    );
  }
  if (frame < h5) {
    // h4: el jefe solo se entera recorriendo el campus.
    const pila = tw(frame, [
      [h4, 3],
      [momentoDe(escena, 'h4', 0.6), 9],
    ]);
    const nube = apareceEn(escena, 'h4', frame, 0.45);
    return (
      <AbsoluteFill>
        <Lienzo>
          <rect x={0} y={0} width={1920} height={940} fill={COLOR.barriga} />
          <rect x={0} y={760} width={1920} height={180} fill={COLOR.arena} />
          <rect x={1240} y={120} width={520} height={360} rx={12} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={8} />
          <rect x={1256} y={136} width={488} height={328} fill={COLOR.cuerpo} />
          <Arbol x={1380} y={470} alto={220} />
          <Arbol x={1620} y={470} alto={260} copa={COLOR.cuerpo} />
          <line x1={1500} y1={120} x2={1500} y2={480} stroke={COLOR.borde} strokeWidth={8} />
          {/* Escritorio con hojas de cálculo apiladas */}
          <rect x={560} y={600} width={760} height={34} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
          <rect x={600} y={634} width={20} height={200} fill={COLOR.borde} />
          <rect x={1260} y={634} width={20} height={200} fill={COLOR.borde} />
          {Array.from({ length: Math.round(pila) }, (_, i) => (
            <g key={i} transform={`rotate(${(i % 3) - 1} ${1060} ${590 - i * 14})`}>
              <rect x={960} y={580 - i * 14} width={220} height={14} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={3} />
            </g>
          ))}
          <rect x={700} y={420} width={220} height={150} rx={8} fill={COLOR.borde} />
          {Array.from({ length: 24 }, (_, k) => (
            <rect key={k} x={714 + (k % 6) * 33} y={434 + Math.floor(k / 6) * 31} width={29} height={27} fill={COLOR.blanco} />
          ))}
          <rect x={800} y={570} width={20} height={30} fill={COLOR.borde} />
          {/* Lo que imagina: recorrer el campus */}
          <g opacity={nube} transform={`translate(0 ${(1 - nube) * 20})`}>
            {[
              [380, 230, 70],
              [470, 190, 90],
              [580, 220, 75],
              [470, 270, 80],
            ].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={5} />
            ))}
            {[
              [380, 230, 70],
              [470, 190, 90],
              [580, 220, 75],
              [470, 270, 80],
            ].map(([cx, cy, r], i) => (
              <circle key={`i${i}`} cx={cx} cy={cy} r={r - 3} fill={COLOR.blanco} />
            ))}
            <Arbol x={410} y={270} alto={110} />
            <Arbol x={560} y={260} alto={130} copa={COLOR.cuerpo} />
            <path d="M360 300 Q470 250 600 300" fill="none" stroke={COLOR.borde} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
            <circle cx={300} cy={380} r={18} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={4} />
            <circle cx={270} cy={430} r={11} fill={COLOR.blanco} stroke={COLOR.borde} strokeWidth={4} />
          </g>
        </Lienzo>
        <Persona quien="jefe" x={420} sueloY={850} escala={1.15} frame={frame} pose={{ brazoI: 40, brazoD: 165 + Math.sin(frame / 4) * 6, miraX: 0.4, miraY: -0.3 }} gesto="pensativo" sentado />
      </AbsoluteFill>
    );
  }
  // h5: la cuadrilla poda quince árboles y nadie sabe si quedaron bien.
  const avance = tw(frame, [
    [h5, 0],
    [momentoDe(escena, 'h5', 0.75), 1],
  ]);
  const arboles = [760, 980, 1200, 1420, 1640];
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={0} frame={frame} />
        {arboles.map((x, i) => (
          <Arbol key={x} x={x} y={SUELO - 30} alto={300} copa={i % 2 ? COLOR.cuerpo : COLOR.hoja} vaiven={Math.sin((frame + i * 9) / 7) * (avance > i / 5 && avance < (i + 1) / 5 ? 3 : 0.5)} />
        ))}
        {arboles.map((x, i) => {
          const t = interpolate(avance, [(i + 0.6) / 5, (i + 0.9) / 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const s = spring({ frame: Math.round(t * 12), fps: FPS, config: { damping: 8 } }) * (t > 0 ? 1 : 0);
          return (
            <g key={`p${x}`} transform={`translate(${x} ${SUELO - 380}) scale(${s})`}>
              <circle r={34} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={5} />
              <text y={16} textAnchor="middle" fontSize={46} fontWeight={800} fill={COLOR.borde}>
                ?
              </text>
            </g>
          );
        })}
      </Lienzo>
      {[0, 1].map((i) => (
        <Persona
          key={i}
          quien="podador"
          x={500 + i * 130 + avance * 980}
          sueloY={SUELO + 8}
          escala={0.8}
          frame={frame}
          pose={{ brazoI: 20, brazoD: 95 + Math.sin(frame / 3 + i) * 10 }}
          gesto="neutral"
          objeto="podadora"
          andar={{ distancia: avance * 980, w: avance > 0 && avance < 1 ? 1 : 0 }}
        />
      ))}
      <Tarjeta texto={`${Math.round(avance * 15)} árboles podados · ¿bien hechos?`} visible={apareceEn(escena, 'h5', frame, 0.05)} />
    </AbsoluteFill>
  );
};

// ---------------- 3. Aparece Hespo ----------------
/** Donde brota Hespo: el `x` de h6 en guion-historia.json. */
const X_BROTE = 1080;

export const Aparece: React.FC<PropsEscena> = ({ escena, frame }) => {
  const t = frame - escena.desde;
  const brota = ESPERA_BROTE;
  const temblor = t < brota ? Math.sin(t * 2.5) * 4 : 0;
  const sorpresa = t >= brota && t < brota + 30;
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={300} frame={frame} />
        <ArbolRajado x={1350} y={SUELO - 30} frame={frame} alerta={0} />
        {t < brota + 4 ? <ellipse cx={X_BROTE + temblor} cy={SUELO + 4} rx={60} ry={16} fill={COLOR.borde} opacity={0.5} /> : null}
        <Tierra x={X_BROTE} y={SUELO} t={t - brota} />
      </Lienzo>
      <Persona
        quien="julio"
        x={tw(frame, [
          [escena.desde + brota, 680],
          [escena.desde + brota + 10, 600],
        ])}
        sueloY={SUELO + 4}
        escala={0.95}
        frame={frame}
        pose={{ brazoI: sorpresa ? 70 : 12, brazoD: sorpresa ? 70 : 14, miraX: 0.8, miraY: t < brota ? -0.6 : 0.1 }}
        gesto={t < brota ? 'preocupado' : sorpresa ? 'sorpresa' : 'feliz'}
      />
    </AbsoluteFill>
  );
};

// ---------------- 4. Solución ----------------
/**
 * Puntos medidos sobre las capturas del mapa al atardecer (fracción del ancho y del alto de la
 * imagen 1920×941): el pin «1» de la incidencia y zonas verdes del campus para los checks.
 */
const PIN_INCIDENCIA: [number, number] = [0.704, 0.585];
const CHECKS_EN_CAMPUS: [number, number][] = [
  [0.47, 0.44],
  [0.65, 0.58],
  [0.52, 0.73],
  [0.4, 0.66],
  [0.74, 0.62],
];

const Oficina: React.FC = () => (
  <Lienzo>
    <rect x={0} y={0} width={1920} height={940} fill={COLOR.barriga} />
    <rect x={0} y={780} width={1920} height={160} fill={COLOR.arena} />
    <rect x={120} y={120} width={360} height={300} rx={12} fill={COLOR.cuerpo} stroke={COLOR.borde} strokeWidth={8} />
    <Arbol x={300} y={410} alto={240} />
    <rect x={500} y={760} width={1200} height={30} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
  </Lienzo>
);

export const Solucion: React.FC<PropsEscena> = ({ escena, frame }) => {
  const medida = useMedida();
  const h8 = momentoDe(escena, 'h8', 0);
  const h10 = momentoDe(escena, 'h10', 0);
  if (frame < h8) {
    // h7: Don Julio lo cuenta en una frase desde su celular.
    const alto = 820;
    const anchoPantalla = alto * 0.5 * 0.9;
    const m = medida('venta/reporte-celular', 'texto');
    const k = anchoPantalla / 780;
    return (
      <AbsoluteFill>
        <Lienzo>
          <Campus corrimiento={300} frame={frame} />
        </Lienzo>
        <Persona quien="julio" x={420} sueloY={SUELO + 4} escala={1.15} frame={frame} pose={{ brazoI: 10, brazoD: 120, miraX: 0.7 }} gesto="feliz" objeto="celular" />
        <Celular x={1060} y={50} alto={alto} captura="venta/reporte-celular">
          <Resalte medida={{ x: m.x * k, y: m.y * k, ancho: m.ancho * k, alto: m.alto * k }} visible={apareceEn(escena, 'h7', frame, 0.35)} />
        </Celular>
      </AbsoluteFill>
    );
  }
  if (frame < h10) {
    // h8-h9: la IA completa el resto; el jefe lo activa y aparece en el mapa.
    const enMapa = frame >= momentoDe(escena, 'h9', 0.2);
    const ancho = 1060;
    const k = ancho / 1920;
    const pre = medida('venta/incidencia-prellenada', 'prellenado');
    const pulso = ((frame - momentoDe(escena, 'h9', 0.3)) % 36) / 36;
    return (
      <AbsoluteFill>
        <Oficina />
        <Persona quien="jefe" x={330} sueloY={870} escala={1.05} frame={frame} pose={{ brazoI: 30, brazoD: enMapa ? 85 : 40, miraX: 0.8 }} gesto={frame < momentoDe(escena, 'h8', 0.4) ? 'sorpresa' : 'feliz'} sentado />
        <Laptop x={1080} y={150} ancho={ancho} captura={enMapa ? 'venta/mapa-atardecer' : 'venta/incidencia-prellenada'}>
          {!enMapa ? <Resalte medida={{ x: pre.x * k, y: pre.y * k, ancho: pre.ancho * k, alto: pre.alto * k }} visible={apareceEn(escena, 'h8', frame, 0.15)} /> : null}
          {enMapa && pulso >= 0 ? <Pulso x={ancho * PIN_INCIDENCIA[0]} y={((ancho * 941) / 1920) * PIN_INCIDENCIA[1]} progreso={pulso} /> : null}
        </Laptop>
        {!enMapa ? <Tarjeta texto="✨ Prellenado por IA" visible={apareceEn(escena, 'h8', frame, 0.2)} x={1230} y={40} /> : null}
        {enMapa ? <Tarjeta texto="✓ Activada · trabajo programado" visible={apareceEn(escena, 'h9', frame, 0.55)} x={760} y={40} /> : null}
      </AbsoluteFill>
    );
  }
  // h10: la cuadrilla corta la rama, sube la foto y la incidencia se cierra.
  // La grieta cede despacio mientras podan y recién entonces la rama cae: se alcanza a leer.
  const corte = tw(frame, [
    [momentoDe(escena, 'h10', 0.05), 0],
    [momentoDe(escena, 'h10', 0.3), 0.12],
    [momentoDe(escena, 'h10', 0.46), 1],
  ]);
  const flash = interpolate(frame, [momentoDe(escena, 'h10', 0.48), momentoDe(escena, 'h10', 0.5), momentoDe(escena, 'h10', 0.58)], [0, 0.9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sello = (frame - momentoDe(escena, 'h10', 0.62)) / 8;
  return (
    <AbsoluteFill>
      <Lienzo>
        <Campus corrimiento={300} frame={frame} />
        <ArbolRajado x={1350} y={SUELO - 30} frame={frame} alerta={0} corte={corte} />
      </Lienzo>
      <Persona quien="podador" x={1000} sueloY={SUELO + 6} escala={0.9} frame={frame} pose={{ brazoI: 20, brazoD: corte < 1 ? 100 + Math.sin(frame / 2.5) * 12 : 20 }} gesto="neutral" objeto="podadora" />
      <Persona quien="podador" x={1180} sueloY={SUELO + 6} escala={0.9} frame={frame} pose={{ brazoI: 15, brazoD: frame > momentoDe(escena, 'h10', 0.4) ? 125 : 15, miraX: -0.4 }} gesto="feliz" objeto="celular" mira={-1} />
      <Persona quien="julio" x={560} sueloY={SUELO + 4} escala={0.95} frame={frame} pose={{ brazoI: 10, brazoD: sello > 0 ? 70 : 12, miraX: 0.6 }} gesto={sello > 0 ? 'feliz' : 'neutral'} />
      <AbsoluteFill style={{ background: COLOR.blanco, opacity: flash }} />
      <Sello x={960} y={330} texto="Cerrada" t={sello} />
    </AbsoluteFill>
  );
};

// ---------------- 5. Resultado ----------------
export const Resultado: React.FC<PropsEscena> = ({ escena, frame }) => {
  const h12 = momentoDe(escena, 'h12', 0);
  if (frame < h12) {
    const ancho = 980;
    return (
      <AbsoluteFill>
        <Lienzo>
          <rect x={0} y={0} width={1920} height={940} fill={COLOR.barriga} />
          <rect x={0} y={780} width={1920} height={160} fill={COLOR.arena} />
          <rect x={80} y={700} width={760} height={30} rx={8} fill={COLOR.arena} stroke={COLOR.borde} strokeWidth={6} />
        </Lienzo>
        <Laptop x={1080} y={60} ancho={ancho} captura="venta/mapa-atardecer-maqueta">
          {CHECKS_EN_CAMPUS.map(([fx, fy], i) => {
            const s = spring({ frame: frame - momentoDe(escena, 'h11', 0.2 + i * 0.1), fps: FPS, config: { damping: 9 } });
            const altoPantalla = (ancho * 941) / 1920;
            return (
              <div key={i} style={{ position: 'absolute', left: ancho * fx - 22, top: altoPantalla * fy - 22, width: 44, height: 44, borderRadius: 22, background: COLOR.verde, color: COLOR.blanco, fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})` }}>
                ✓
              </div>
            );
          })}
        </Laptop>
        <Persona quien="peaton" x={250} sueloY={850} escala={0.95} frame={frame} pose={{ brazoI: 20, brazoD: 25, miraX: 0.8 }} gesto="feliz" sentado ropa={COLOR.verde} />
        <Persona quien="peaton" x={520} sueloY={850} escala={0.95} frame={frame} pose={{ brazoI: 20, brazoD: 25, miraX: 0.8 }} gesto="neutral" sentado ropa={COLOR.arena} />
        <Persona quien="jefe" x={1720} sueloY={880} escala={1.05} frame={frame} pose={{ brazoI: 10, brazoD: 95, miraX: 0.5 }} gesto="feliz" mira={-1} />
      </AbsoluteFill>
    );
  }
  const titulo = spring({ frame: frame - momentoDe(escena, 'h12', 0.05), fps: FPS, config: { damping: 10, stiffness: 120 } });
  const lema = apareceEn(escena, 'h12', frame, 0.3);
  const saludo = 120 + Math.sin(frame / 4) * 25;
  return (
    <AbsoluteFill style={{ background: COLOR.verde, height: ALTO - BANDA }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 780, bottom: 0, background: COLOR.arena }} />
      <h1 style={{ position: 'absolute', left: 0, right: 0, top: 70, margin: 0, textAlign: 'center', color: COLOR.blanco, fontSize: 150, fontWeight: 800, opacity: Math.min(1, titulo), transform: `scale(${0.7 + 0.3 * titulo})` }}>Hesperides</h1>
      <p style={{ position: 'absolute', left: 0, right: 0, top: 280, margin: 0, textAlign: 'center', color: COLOR.arena, fontSize: 52, fontWeight: 700, opacity: lema }}>El cuidado de sus áreas verdes, en un solo lugar.</p>
      <Persona quien="julio" x={520} sueloY={880} escala={1} frame={frame} pose={{ brazoI: 10, brazoD: saludo }} gesto="feliz" />
      <Persona quien="jefe" x={860} sueloY={880} escala={1} frame={frame} pose={{ brazoI: 10, brazoD: 240 - saludo }} gesto="feliz" mira={-1} />
    </AbsoluteFill>
  );
};
