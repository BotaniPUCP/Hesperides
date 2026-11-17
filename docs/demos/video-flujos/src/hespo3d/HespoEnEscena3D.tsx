import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import type { EstadoHespo } from '../hespo/recorrido';
import { ALTO, ANCHO } from '../tema';
import { Hespo3D } from './Hespo3D';
import { transformacion3D } from './transformacion';

/**
 * Hespo 3D en un lienzo transparente del tamaño del video. La cámara ortográfica mide en píxeles
 * (x a la derecha, y hacia arriba), así el modelo cae donde estaría el Hespo 2D.
 */
export const HespoEnEscena3D: React.FC<{ estado: EstadoHespo; frame: number; apertura: number; escala: number }> = ({
  estado,
  frame,
  apertura,
  escala,
}) => (
  <ThreeCanvas
    width={ANCHO}
    height={ALTO}
    orthographic
    camera={{ zoom: 1, position: [ANCHO / 2, -ALTO / 2, 2000], near: 1, far: 4000 }}
    gl={{ alpha: true, antialias: true }}
    style={{ position: 'absolute', inset: 0 }}
  >
    <ambientLight intensity={0.9} />
    <hemisphereLight args={['#ffffff', '#D8CFA4', 0.8]} />
    <directionalLight position={[600, 900, 1200]} intensity={2.2} />
    <directionalLight position={[-800, 300, -600]} intensity={0.8} color="#cfeedd" />
    <Hespo3D t={transformacion3D(estado, escala)} frame={frame} apertura={apertura} />
  </ThreeCanvas>
);
