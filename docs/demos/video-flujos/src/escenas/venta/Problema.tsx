import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { Easing, interpolate, random } from 'remotion';
import { ALTO, ANCHO, BANDA, COLOR } from '../../tema';
import { apareceEn, momentoDe, progresoEntre } from '../../ui/anim';
import { Tarjeta } from '../../ui/Tarjeta';
import type { PropsEscena } from '../tipos';
import { Arbol, arbolesDelCampus, crecimiento, HojaDeCalculo, Suelo } from './campus3d';

const ARBOLES = 49;
/** Tres pilas separadas: la información está repartida y no se habla entre sí. */
const PILAS: [number, number][] = [
  [-4.5, 1.5],
  [0.5, -3],
  [4.5, 2],
];
const HOJAS_POR_PILA = 4;
const ALTO_LIENZO = ALTO - BANDA;

const Camara: React.FC<{ baja: number; orbita: number }> = ({ baja, orbita }) => {
  const camera = useThree((s) => s.camera);
  const alto = interpolate(baja, [0, 1], [15, 6]);
  const dist = interpolate(baja, [0, 1], [11, 16]);
  camera.position.set(Math.sin(orbita) * dist, alto, Math.cos(orbita) * dist);
  camera.lookAt(0, interpolate(baja, [0, 1], [0, 0.5]), 0);
  return null;
};

const Dato: React.FC<{ x: number; aparicion: number; cifra: string; texto: string }> = ({ x, aparicion, cifra, texto }) => (
  <Tarjeta x={x} y={70} ancho={520} alto={170} aparicion={aparicion}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLOR.verde }}>
      <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1 }}>{cifra}</span>
      <span style={{ fontSize: 36, fontWeight: 700 }}>{texto}</span>
    </div>
  </Tarjeta>
);

/** v1-v3: el campus que brota, las hojas sueltas y el camino que hay que recorrer. */
export const Problema: React.FC<PropsEscena> = ({ escena, frame }) => {
  // Los caminos (x = 0 y z = 0) quedan libres para que se lean, y no hay árboles bajo las pilas de hojas.
  const arboles = useMemo(
    () =>
      arbolesDelCampus(ARBOLES)
        .filter((a) => Math.abs(a.pos[0]) > 1 && Math.abs(a.pos[1]) > 1)
        .filter((a) => PILAS.every(([px, pz]) => Math.hypot(a.pos[0] - px, a.pos[1] - pz) > 2))
        .sort((a, b) => a.orden - b.orden),
    [],
  );
  const inicioV1 = momentoDe(escena, 'v1', 0);
  const inicioV2 = momentoDe(escena, 'v2', 0);
  const finV2 = momentoDe(escena, 'v2', 0.8);
  const baja = interpolate(progresoEntre(escena, 'v3', frame, 0, 0.35), [0, 1], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  const orbita = interpolate(frame, [inicioV1, momentoDe(escena, 'v3', 1)], [-0.25, 0.2]);
  const sinDatos = 1 - apareceEn(escena, 'v2', frame, 0);

  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: ALTO_LIENZO }}>
        <ThreeCanvas width={ANCHO} height={ALTO_LIENZO} shadows camera={{ fov: 40 }}>
          <Camara baja={baja} orbita={orbita} />
          <color attach="background" args={[COLOR.verde]} />
          <fog attach="fog" args={[COLOR.verde, 18, 45]} />
          <ambientLight intensity={0.9} />
          <hemisphereLight args={['#ffffff', COLOR.arena, 0.7]} />
          <directionalLight position={[6, 12, 8]} intensity={2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
          <Suelo />
          {arboles.map((a, i) => (
            <Arbol key={i} pos={a.pos} alto={a.alto} copa={a.copa} crece={crecimiento(frame, inicioV1 + 6 + i * 1.6)} />
          ))}
          {PILAS.flatMap(([px, pz], p) =>
            Array.from({ length: HOJAS_POR_PILA }, (_, h) => {
              const n = p * HOJAS_POR_PILA + h;
              const llega = inicioV2 + 4 + n * ((finV2 - inicioV2 - 4) / (PILAS.length * HOJAS_POR_PILA));
              const cae = interpolate(frame, [llega - 12, llega], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
              if (cae === 0) return null;
              const y = interpolate(cae, [0, 1], [7, 0.4 + h * 0.06]);
              const giro = (random(`h${n}`) - 0.5) * 1.2;
              return (
                <group key={n} scale={2.2} position={[px, 0, pz]}>
                  <HojaDeCalculo pos={[(random(`hx${n}`) - 0.5) * 0.15, y / 2.2, 0]} giro={giro} />
                </group>
              );
            }),
          )}
        </ThreeCanvas>
      </div>
      <Dato x={300} aparicion={apareceEn(escena, 'v1', frame, 0.05) * sinDatos} cifra="41 ha" texto="de campus" />
      <Dato x={1100} aparicion={apareceEn(escena, 'v1', frame, 0.5) * sinDatos} cifra="+3 000" texto="árboles" />
    </>
  );
};
