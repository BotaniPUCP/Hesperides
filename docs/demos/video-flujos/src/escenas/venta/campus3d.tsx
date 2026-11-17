import React from 'react';
import { random, spring } from 'remotion';
import * as THREE from 'three';
import { COLOR } from '../../tema';
import { FPS } from '../../tiempos';

/** Un árbol de copa redonda con contorno oscuro, como Hespo. `crece` va de 0 a 1 (con rebote). */
export const Arbol: React.FC<{ pos: [number, number]; alto: number; crece: number; copa: string }> = ({ pos, alto, crece, copa }) => (
  <group position={[pos[0], 0, pos[1]]} scale={Math.max(0.0001, crece)}>
    <mesh position={[0, alto * 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.12, alto * 0.7, 10]} />
      <meshStandardMaterial color={COLOR.borde} roughness={0.8} />
    </mesh>
    <mesh position={[0, alto * 0.85, 0]} castShadow>
      <sphereGeometry args={[alto * 0.38, 24, 24]} />
      <meshStandardMaterial color={copa} roughness={0.6} />
    </mesh>
    <mesh position={[0, alto * 0.85, 0]} scale={1.07}>
      <sphereGeometry args={[alto * 0.38, 24, 24]} />
      <meshBasicMaterial color={COLOR.borde} side={THREE.BackSide} />
    </mesh>
  </group>
);

export type ArbolDelCampus = { pos: [number, number]; alto: number; copa: string; orden: number };

/** Árboles repartidos en una cuadrícula con desorden fijo: siempre los mismos en cada render. */
export function arbolesDelCampus(cantidad: number): ArbolDelCampus[] {
  const lado = Math.ceil(Math.sqrt(cantidad));
  return Array.from({ length: cantidad }, (_, i) => {
    const fila = Math.floor(i / lado);
    const col = i % lado;
    const x = (col - (lado - 1) / 2) * 2.2 + (random(`ax${i}`) - 0.5) * 1.2;
    const z = (fila - (lado - 1) / 2) * 2.2 + (random(`az${i}`) - 0.5) * 1.2;
    return {
      pos: [x, z],
      alto: 1.1 + random(`al${i}`) * 0.8,
      copa: random(`c${i}`) > 0.5 ? COLOR.cuerpo : COLOR.hoja,
      // Brotan desde el centro hacia afuera.
      orden: Math.hypot(x, z),
    };
  });
}

/** Crecimiento con rebote de un árbol que brota en `inicio`. */
export function crecimiento(frame: number, inicio: number): number {
  return spring({ frame: frame - inicio, fps: FPS, config: { damping: 8, stiffness: 140 } });
}

/** Suelo arena con caminos claros y jardines. */
export const Suelo: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={COLOR.arena} roughness={1} />
    </mesh>
    {[
      [0, 0, 1.2, 40],
      [0, 0, 40, 1.2],
    ].map(([x, z, ancho, largo], i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]} receiveShadow>
        <planeGeometry args={[ancho, largo]} />
        <meshStandardMaterial color={COLOR.barriga} roughness={1} />
      </mesh>
    ))}
  </group>
);

/** Una hoja de cálculo: lámina blanca con cuadrícula verde. */
export const HojaDeCalculo: React.FC<{ pos: [number, number, number]; giro: number }> = ({ pos, giro }) => (
  <group position={pos} rotation={[0, giro, 0]}>
    <mesh castShadow>
      <boxGeometry args={[1.4, 0.03, 1.0]} />
      <meshStandardMaterial color={COLOR.blanco} roughness={0.7} />
    </mesh>
    {[-0.3, -0.1, 0.1, 0.3].map((z) => (
      <mesh key={`f${z}`} position={[0, 0.02, z]}>
        <boxGeometry args={[1.3, 0.01, 0.02]} />
        <meshBasicMaterial color={COLOR.hoja} />
      </mesh>
    ))}
    {[-0.35, 0, 0.35].map((x) => (
      <mesh key={`c${x}`} position={[x, 0.02, 0]}>
        <boxGeometry args={[0.02, 0.01, 0.9]} />
        <meshBasicMaterial color={COLOR.hoja} />
      </mesh>
    ))}
  </group>
);
