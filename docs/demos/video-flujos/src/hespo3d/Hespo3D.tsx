import React, { useMemo } from 'react';
import * as THREE from 'three';
import { COLOR } from '../tema';
import { parpadeo } from '../hespo/recorrido';
import type { Transformacion3D } from './transformacion';

type V3 = [number, number, number];

/** Material «de juguete»: algo de brillo para que se lea el volumen. */
const Mat: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.55 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} />
);
const MatContorno = () => <meshBasicMaterial color={COLOR.borde} side={THREE.BackSide} />;

/** Elipsoide con su contorno oscuro (casco invertido), como el trazo del Hespo 2D. */
const Bola: React.FC<{ pos?: V3; escala: V3; color: string; rough?: number; borde?: number }> = ({
  pos = [0, 0, 0],
  escala,
  color,
  rough,
  borde = 0,
}) => (
  <group position={pos}>
    <mesh scale={escala}>
      <sphereGeometry args={[1, 48, 48]} />
      <Mat color={color} rough={rough} />
    </mesh>
    {borde ? (
      <mesh scale={escala.map((e) => e + borde) as V3}>
        <sphereGeometry args={[1, 48, 48]} />
        <MatContorno />
      </mesh>
    ) : null}
  </group>
);

// Cuerpo: elipsoide de semiejes CX, CY, CZ, con el centro a SUELA sobre la suela.
const CX = 0.86;
const CY = 1.0;
const CZ = 0.8;
const SUELA = 1.47;
/** Profundidad de la superficie del cuerpo en (x, y): para pegar la cara sin que flote. */
const superficie = (x: number, y: number) => CZ * Math.sqrt(Math.max(0, 1 - (x / CX) ** 2 - (y / CY) ** 2));

/** Hojas asimétricas: la derecha de quien mira es la más grande (regla de marca). */
const Hoja: React.FC<{ lado: 1 | -1; vaiven: number }> = ({ lado, vaiven }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.15, 0.32, 0.62, 0.38, 0.85, 0.12);
    s.bezierCurveTo(0.62, -0.12, 0.2, -0.12, 0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 24 });
  }, []);
  return (
    <group rotation={[0, 0, (lado === 1 ? 0.35 : Math.PI - 0.35) + vaiven * lado]} scale={lado === 1 ? 1.05 : 0.9}>
      <mesh geometry={geo} position={[0, 0, -0.035]}>
        <Mat color={COLOR.hoja} rough={0.45} />
      </mesh>
      <mesh geometry={geo} position={[-0.02, 0, -0.035]} scale={[1.05, 1.14, 1.6]}>
        <MatContorno />
      </mesh>
    </group>
  );
};

/** `giro` en radianes: 0 cuelga, positivo sube hacia afuera. */
const Brazo: React.FC<{ lado: 1 | -1; giro: number }> = ({ lado, giro }) => (
  <group position={[0.74 * lado, -0.1, 0.05]} rotation={[0, 0, giro * lado]}>
    <mesh position={[0.12 * lado, -0.28, 0]} rotation={[0, 0, 0.35 * lado]}>
      <capsuleGeometry args={[0.07, 0.42, 8, 16]} />
      <Mat color={COLOR.cuerpo} />
    </mesh>
    <mesh position={[0.12 * lado, -0.28, 0]} rotation={[0, 0, 0.35 * lado]}>
      <capsuleGeometry args={[0.095, 0.42, 8, 16]} />
      <MatContorno />
    </mesh>
    <Bola pos={[0.25 * lado, -0.6, 0]} escala={[0.13, 0.13, 0.13]} color={COLOR.cuerpo} borde={0.03} />
  </group>
);

const Pierna: React.FC<{ lado: 1 | -1; giro: number }> = ({ lado, giro }) => (
  <group position={[0.3 * lado, -0.88, 0]} rotation={[0, 0, giro]}>
    <mesh position={[0, -0.2, 0]}>
      <cylinderGeometry args={[0.075, 0.075, 0.42, 16]} />
      <Mat color={COLOR.borde} />
    </mesh>
    <Bola pos={[0.06 * lado, -0.44, 0.1]} escala={[0.19, 0.08, 0.24]} color={COLOR.borde} rough={0.4} />
  </group>
);

const Ojo: React.FC<{ x: number; abierto: number }> = ({ x, abierto }) => {
  const y = 0.2;
  return (
    <group position={[x, y, superficie(x, y) - 0.03]} rotation={[-0.15, (x / CX) * 1.1, 0]}>
      <mesh scale={[0.12, abierto ? 0.165 : 0.02, 0.07]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={COLOR.negro} roughness={0.12} />
      </mesh>
      {abierto ? (
        <mesh position={[0.045, 0.06, 0.06]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={COLOR.blanco} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Sonrisa cerrada (arco) que se abre en una boca con lengua al hablar. */
const Boca: React.FC<{ apertura: number }> = ({ apertura }) => {
  const y = -0.06;
  const abre = Math.min(1, apertura);
  return (
    <group position={[0, y, superficie(0, y) - 0.02]} rotation={[-0.1, 0, 0]}>
      {abre < 0.12 ? (
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.1, 0.022, 12, 32, Math.PI]} />
          <meshStandardMaterial color={COLOR.borde} roughness={0.5} />
        </mesh>
      ) : (
        <group scale={[1, 0.35 + abre * 0.75, 1]}>
          <mesh position={[0, -0.05, 0]} scale={[0.12, 0.1, 0.05]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color={COLOR.borde} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.1, 0.03]} scale={[0.07, 0.04, 0.03]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={COLOR.hoja} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Leve giro de tres cuartos y mirada desde arriba: con cámara ortográfica de frente, se lee el volumen. */
const TRES_CUARTOS = 0.28;
const DESDE_ARRIBA = 0.12;

/** Hespo en 3D con los pies en el origen; `t` lo ubica y lo posa. */
export const Hespo3D: React.FC<{ t: Transformacion3D; frame: number; apertura: number }> = ({ t, frame, apertura }) => {
  const abierto = parpadeo(frame);
  const respira = Math.sin(frame / 18) * 0.02;
  const vaiven = Math.sin((frame - 6) / 16) * 0.08;

  return (
    <group position={[t.x, t.y, 0]} scale={t.escalaPx}>
      {/* Sombra elíptica, como la del Hespo 2D. */}
      <mesh position={[0, 0.02, -1]} scale={[0.95, 0.12, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={COLOR.negro} transparent opacity={0.18} />
      </mesh>
      <group rotation={[DESDE_ARRIBA, t.giroY - TRES_CUARTOS + t.mirada * 0.5, 0]}>
        <group position={[0, SUELA, 0]} rotation={[0, 0, -t.inclina]}>
          <group scale={[1, 1 + respira, 1]}>
            <Bola escala={[CX, CY, CZ]} color={COLOR.cuerpo} borde={0.035} />
            <Bola pos={[0, -0.42, superficie(0, -0.42) - 0.24]} escala={[0.5, 0.3, 0.26]} color={COLOR.barriga} rough={0.7} />
            <Ojo x={-0.24} abierto={abierto} />
            <Ojo x={0.24} abierto={abierto} />
            {[-0.48, 0.48].map((x) => (
              <group key={x} position={[x, 0.0, superficie(x, 0) - 0.015]} rotation={[0, (x / CX) * 1.1, 0]}>
                <mesh scale={[0.12, 0.07, 0.02]}>
                  <sphereGeometry args={[1, 24, 24]} />
                  <Mat color={COLOR.hoja} rough={0.8} />
                </mesh>
              </group>
            ))}
            <Boca apertura={apertura} />
            <group position={[0, 0.95, 0]} rotation={[0, 0, vaiven * 0.5]}>
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.045, 0.06, 0.28, 16]} />
                <Mat color={COLOR.borde} />
              </mesh>
              <group position={[0, 0.25, 0]}>
                <Hoja lado={1} vaiven={vaiven} />
                <Hoja lado={-1} vaiven={-vaiven} />
              </group>
            </group>
            <Brazo lado={-1} giro={0.15 + t.brazoI} />
            <Brazo lado={1} giro={0.15 + t.brazoD} />
          </group>
          <Pierna lado={-1} giro={t.piernaI} />
          <Pierna lado={1} giro={t.piernaD} />
        </group>
      </group>
    </group>
  );
};
