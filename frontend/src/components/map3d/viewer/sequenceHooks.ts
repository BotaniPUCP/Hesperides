import type * as THREE from 'three';
import type { CameraPose, CameraRig } from './cameraRig';
import type { SequenceLook } from '../sequence/sequenceTimeline';

/**
 * Lo que la secuencia de SPEC-118 le pide al visor: mover la cámara sin vuelo,
 * cambiar de versión sin mover la cámara y congelar el cuadro visible.
 */

/** Píxeles de dibujo por píxel CSS en la versión de poca calidad: el navegador los amplía sin suavizar. */
const LOW_PIXEL_RATIO = 0.3;
/** Sin límite de inclinación: la pose final va casi horizontal (SPEC-118 D-06). */
const FREE_MAX_POLAR = Math.PI * 0.499;

export interface SequenceHooks {
  /** Entra o sale del modo secuencia: cámara libre y sin que la persona la toque. */
  setSequence: (on: boolean) => void;
  setPoseNow: (pose: CameraPose) => void;
  setSequenceLook: (look: SequenceLook) => void;
  /** Dibuja el cuadro actual y lo devuelve copiado, con el fondo, en un canvas 2D. */
  freezeFrame: () => HTMLCanvasElement;
  /** Exportación (§8): tamaño fijo, densidad 1 y sin el bucle de dibujo; cada cuadro lo pide `freezeFrame`. */
  beginExport: (width: number, height: number) => void;
  endExport: () => void;
}

export interface SequenceDeps {
  renderer: THREE.WebGLRenderer;
  rig: CameraRig;
  backdrop: HTMLCanvasElement;
  sun: THREE.DirectionalLight;
  /** Prende o apaga el Atardecer a esa hora, sin el vuelo a su toma. */
  setGolden: (on: boolean, hour: number) => void;
  /** Vuelve a calcular tamaños tras cambiar la densidad de píxeles o el tamaño fijo, sin rehacer el tema. */
  resize: () => void;
  /** El ajuste completo del visor a su contenedor, tema incluido. */
  layout: () => void;
  setFixedSize: (size: { w: number; h: number } | null) => void;
  setPaused: (paused: boolean) => void;
  draw: () => void;
  requestRender: () => void;
}

export function createSequenceHooks(d: SequenceDeps, goodHour: number): SequenceHooks {
  const kept = { ratio: d.renderer.getPixelRatio(), maxPolar: d.rig.controls.maxPolarAngle };
  let fullRatio = kept.ratio;

  function setPixelRatio(ratio: number) {
    d.renderer.setPixelRatio(ratio);
    d.renderer.domElement.style.imageRendering = ratio < 1 ? 'pixelated' : '';
    d.resize();
  }

  return {
    setSequence(on) {
      d.rig.cancelFlight();
      d.rig.setFree(on);
      d.rig.controls.enabled = !on;
      d.rig.controls.enableDamping = !on;
      d.rig.controls.maxPolarAngle = on ? FREE_MAX_POLAR : kept.maxPolar;
      if (!on) {
        d.sun.castShadow = true;
        setPixelRatio(kept.ratio);
      }
      d.requestRender();
    },
    setPoseNow({ position, target }) {
      d.rig.camera.position.set(...position);
      d.rig.controls.target.set(...target);
      d.rig.camera.lookAt(d.rig.controls.target);
      d.requestRender();
    },
    setSequenceLook(look) {
      const good = look === 'good';
      d.sun.castShadow = good;
      d.setGolden(good, goodHour);
      setPixelRatio(good ? fullRatio : LOW_PIXEL_RATIO);
      d.requestRender();
    },
    freezeFrame() {
      d.draw();
      const source = d.renderer.domElement;
      const out = document.createElement('canvas');
      out.width = d.backdrop.width || source.clientWidth;
      out.height = d.backdrop.height || source.clientHeight;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('El navegador no dio un contexto 2D para congelar el cuadro');
      ctx.imageSmoothingEnabled = false;
      if (d.backdrop.style.visibility !== 'hidden') ctx.drawImage(d.backdrop, 0, 0, out.width, out.height);
      ctx.drawImage(source, 0, 0, out.width, out.height);
      return out;
    },
    beginExport(width, height) {
      d.setPaused(true);
      d.setFixedSize({ w: width, h: height });
      fullRatio = 1;
      setPixelRatio(fullRatio);
    },
    endExport() {
      d.setFixedSize(null);
      fullRatio = kept.ratio;
      d.setPaused(false);
      d.layout();
      d.requestRender();
    },
  };
}
