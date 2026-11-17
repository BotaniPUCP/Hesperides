// PRUEBA DESECHABLE: Hespo en 3D hecho con formas simples (spike, sin pruebas).
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { COLOR } from '../tema';
import { parpadeo } from '../hespo/recorrido';

const fuente = "'Nunito', 'Segoe UI', sans-serif";
type V3 = [number, number, number];

/** Material «de juguete»: algo de brillo para que se lea el volumen. */
const Mat: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.55 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} />
);
const MatContorno = () => <meshBasicMaterial color={COLOR.borde} side={THREE.BackSide} />;

/** Elipsoide con su contorno oscuro (casco invertido), como el trazo del Hespo 2D. */
const Bola: React.FC<{ pos?: V3; escala: V3; color: string; rough?: number; borde?: number; sombra?: boolean }> = ({
  pos = [0, 0, 0],
  escala,
  color,
  rough,
  borde = 0,
  sombra = true,
}) => (
  <group position={pos}>
    <mesh scale={escala} castShadow={sombra}>
      <sphereGeometry args={[1, 64, 64]} />
      <Mat color={color} rough={rough} />
    </mesh>
    {borde ? (
      <mesh scale={escala.map((e) => e + borde) as V3}>
        <sphereGeometry args={[1, 64, 64]} />
        <MatContorno />
      </mesh>
    ) : null}
  </group>
);

// Cuerpo: elipsoide de semiejes CX, CY, CZ.
const CX = 0.86;
const CY = 1.0;
const CZ = 0.8;
/** Profundidad de la superficie del cuerpo en (x, y): para pegar la cara sin que flote. */
const superficie = (x: number, y: number) => CZ * Math.sqrt(Math.max(0, 1 - (x / CX) ** 2 - (y / CY) ** 2));

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
      <mesh geometry={geo} castShadow position={[0, 0, -0.035]}>
        <Mat color={COLOR.hoja} rough={0.45} />
      </mesh>
      <mesh geometry={geo} position={[-0.02, 0, -0.035]} scale={[1.05, 1.14, 1.6]}>
        <MatContorno />
      </mesh>
    </group>
  );
};

const Brazo: React.FC<{ lado: 1 | -1; giro: number }> = ({ lado, giro }) => (
  <group position={[0.74 * lado, -0.1, 0.05]} rotation={[0, 0, giro * lado]}>
    <mesh position={[0.12 * lado, -0.28, 0]} rotation={[0, 0, 0.35 * lado]} castShadow>
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

const Pierna: React.FC<{ lado: 1 | -1 }> = ({ lado }) => (
  <group position={[0.3 * lado, -0.88, 0]}>
    <mesh position={[0, -0.2, 0]} castShadow>
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
  const z = superficie(0, y) - 0.02;
  const abre = Math.min(1, apertura);
  return (
    <group position={[0, y, z]} rotation={[-0.1, 0, 0]}>
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

export const Hespo3D: React.FC<{ frame: number; apertura: number; saludo: number; salto: number; giroY: number }> = ({
  frame,
  apertura,
  saludo,
  salto,
  giroY,
}) => {
  const abierto = parpadeo(frame);
  const respira = Math.sin(frame / 18) * 0.02;
  const vaiven = Math.sin((frame - 6) / 16) * 0.08 + salto * 0.25;
  // Estirar y aplastar: al subir se estira.
  const estira = 1 + salto * 0.12;
  const brazoD = interpolate(saludo, [0, 1], [0.15, 1.9]) + Math.sin(frame / 3.2) * 0.3 * saludo;
  const brazoI = 0.15 + Math.sin(frame / 20) * 0.05 + salto * 1.4;

  return (
    <group position={[0, salto * 0.45, 0]} rotation={[0, giroY, 0]}>
      <group scale={[1 / Math.sqrt(estira), estira + respira, 1 / Math.sqrt(estira)]}>
        <Bola escala={[CX, CY, CZ]} color={COLOR.cuerpo} borde={0.035} />
        {/* Barriga apenas sobresaliente */}
        <Bola pos={[0, -0.42, superficie(0, -0.42) - 0.24]} escala={[0.5, 0.3, 0.26]} color={COLOR.barriga} rough={0.7} sombra={false} />
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
        {/* Tallo y hojas */}
        <group position={[0, 0.95, 0]} rotation={[0, 0, vaiven * 0.5]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.28, 16]} />
            <Mat color={COLOR.borde} />
          </mesh>
          <group position={[0, 0.25, 0]}>
            <Hoja lado={1} vaiven={vaiven} />
            <Hoja lado={-1} vaiven={-vaiven} />
          </group>
        </group>
        <Brazo lado={-1} giro={brazoI} />
        <Brazo lado={1} giro={brazoD + salto * 0.6} />
      </group>
      <Pierna lado={-1} />
      <Pierna lado={1} />
    </group>
  );
};

/** Boca sintética mientras no hay voz: abre y cierra en sílabas. */
function bocaSintetica(frame: number, desde: number, hasta: number): number {
  if (frame < desde || frame > hasta) return 0;
  const t = frame - desde;
  return Math.max(0, Math.sin(t / 2.1)) * (0.55 + 0.45 * Math.sin(t / 7.3) ** 2);
}

const CamaraQueMira: React.FC<{ orbita: number; dist: number }> = ({ orbita, dist }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(Math.sin(orbita) * dist, 0.6, Math.cos(orbita) * dist);
  camera.lookAt(0, -0.1, 0);
  return null;
};

export const PruebaHespo3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Cae desde arriba con rebote.
  const caida = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });
  const alturaEntrada = interpolate(caida, [0, 1], [5, 0]);
  // Saluda entre 1 s y 4 s.
  const saludo =
    interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) -
    interpolate(frame, [120, 132], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Salto de alegría a los 7 s.
  const t = frame - 210;
  const salto = t > 0 && t < 24 ? Math.sin((t / 24) * Math.PI) : 0;
  // Gira a cada lado, como mirando la escena.
  const giroY = interpolate(frame, [140, 165, 190, 205], [0, 0.55, -0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const apertura = bocaSintetica(frame, 36, 100) + bocaSintetica(frame, 240, 285);

  // Cámara: se acerca despacio y orbita un poco.
  const orbita = interpolate(frame, [0, 300], [-0.35, 0.3]);
  const dist = interpolate(frame, [0, 300], [7.2, 5.8]);

  const subtitulo = frame < 110 ? '¡Hola! Soy Hespo.' : frame >= 235 ? 'Ahora, en 3D.' : '';

  return (
    <AbsoluteFill style={{ background: COLOR.verde }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 35 }}>
        <CamaraQueMira orbita={orbita} dist={dist} />
        <fog attach="fog" args={[COLOR.verde, 14, 40]} />
        <ambientLight intensity={0.9} />
        <hemisphereLight args={['#ffffff', COLOR.arena, 0.8]} />
        <directionalLight
          position={[3, 6, 5]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-radius={6}
        />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#cfeedd" />
        <group position={[0, alturaEntrada, 0]}>
          <Hespo3D frame={frame} apertura={apertura} saludo={Math.max(0, saludo)} salto={salto} giroY={giroY} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.47, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color={COLOR.arena} roughness={1} />
        </mesh>
      </ThreeCanvas>
      {subtitulo ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: 140,
            background: COLOR.negro,
            color: COLOR.blanco,
            fontFamily: fuente,
            fontSize: 52,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {subtitulo}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
