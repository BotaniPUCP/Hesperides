import * as THREE from 'three';
import type { SceneTextures } from './textures';

/**
 * Materiales del follaje del prototipo v39: un borde iluminado que abraza la
 * silueta de cada copa (más intenso del lado del sol), un halo suave alrededor y
 * una sombra de contacto difusa en el suelo. Todos cambian entre el día y la noche.
 */

const RIM = {
  day: new THREE.Color('#FFD96A'), night: new THREE.Color('#B8C5FF'),
  dayStrength: 0.42, nightStrength: 0.66, power: 2.35, sunDay: 0.36, sunNight: 0.16,
};
const GLOW = { day: new THREE.Color('#FFE79C'), night: new THREE.Color('#AFC2FF'), dayOpacity: 0.085, nightOpacity: 0.165 };
const CONTACT = { day: 0x5b5448, night: 0x5f77bf, dayOpacity: 0.15, nightOpacity: 0.18 };

export interface FoliageMaterials {
  /** Un material de copa por forma: cada InstancedMesh necesita el suyo. */
  foliage: () => THREE.MeshPhysicalMaterial;
  glow: THREE.MeshBasicMaterial;
  contact: THREE.MeshBasicMaterial;
  /** Ajusta colores e intensidades al tema y a la dirección del sol. */
  setLighting: (night: boolean, sunDirection: THREE.Vector3) => void;
}

/**
 * El borde depende del ángulo con que se ve cada cara (Fresnel), no de una luz
 * más: por eso se suma como emisión en el shader en vez de añadir una lámpara.
 */
function withRim(material: THREE.MeshPhysicalMaterial, uniforms: Record<string, THREE.IUniform>) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
#ifdef USE_INSTANCING
  vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
#else
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimPower;
uniform vec3 uRimSunDir;
uniform float uRimSunInfluence;
varying vec3 vWorldNormal;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float stylizedRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
float sunSide = max(dot(normalize(vWorldNormal), normalize(uRimSunDir)), 0.0);
float sunBoost = mix(1.0, 0.72 + sunSide * 0.72, uRimSunInfluence);
totalEmissiveRadiance += uRimColor * stylizedRim * uRimStrength * sunBoost;`);
  };
  material.customProgramCacheKey = () => `foliage-rim-${RIM.power}`;
  return material;
}

/** Degradado radial: más oscuro bajo el tronco, desvanecido en el borde. */
function contactTexture(): THREE.CanvasTexture {
  const s = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.78)'); g.addColorStop(0.38, 'rgba(0,0,0,0.40)');
  g.addColorStop(0.72, 'rgba(0,0,0,0.13)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

export function createFoliageMaterials(textures: SceneTextures): FoliageMaterials {
  // Uniformes compartidos: todas las copas se reajustan con un solo cambio.
  const uniforms = {
    uRimColor: { value: RIM.day.clone() }, uRimStrength: { value: RIM.dayStrength }, uRimPower: { value: RIM.power },
    uRimSunDir: { value: new THREE.Vector3(0, 1, 0) }, uRimSunInfluence: { value: RIM.sunDay },
  };
  const glow = new THREE.MeshBasicMaterial({
    color: GLOW.day.clone(), transparent: true, opacity: GLOW.dayOpacity, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.BackSide,
  });
  const contact = new THREE.MeshBasicMaterial({
    map: contactTexture(), color: CONTACT.day, transparent: true, opacity: CONTACT.dayOpacity, depthWrite: false, toneMapped: false,
  });
  return {
    foliage: () => withRim(new THREE.MeshPhysicalMaterial({
      color: 0xffffff, flatShading: true, roughness: 0.45, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4,
      sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x80ff80), map: textures.foliage,
      normalMap: textures.foliageNormal, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.05,
    }), uniforms),
    glow,
    contact,
    setLighting(night, sunDirection) {
      uniforms.uRimColor.value.copy(night ? RIM.night : RIM.day);
      uniforms.uRimStrength.value = night ? RIM.nightStrength : RIM.dayStrength;
      uniforms.uRimSunInfluence.value = night ? RIM.sunNight : RIM.sunDay;
      uniforms.uRimSunDir.value.copy(sunDirection);
      glow.color.copy(night ? GLOW.night : GLOW.day);
      glow.opacity = night ? GLOW.nightOpacity : GLOW.dayOpacity;
      contact.color.set(night ? CONTACT.night : CONTACT.day);
      contact.opacity = night ? CONTACT.nightOpacity : CONTACT.dayOpacity;
    },
  };
}
