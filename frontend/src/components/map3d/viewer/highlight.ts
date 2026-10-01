import * as THREE from 'three';
import { sameTarget, type LayerId, type Target } from '../target';
import { paintPoints, type PointLayer } from './furniture';
import { ringLines } from './geometry';
import type { ScenePalette } from './palette';
import { paintPoly, WORLD_LIFT, type PolyLayer } from './polyLayer';

/**
 * Realce de selección y de paso del cursor: el elemento seleccionado se tiñe
 * con el color de acento y lleva un contorno; el que está bajo el cursor, con el
 * de realce. Igual que el prototipo v39.
 */

const mix = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()}`;

export interface Highlight {
  hovered: () => Target | null;
  selected: () => Target | null;
  setHover: (t: Target | null) => void;
  setSelected: (t: Target | null) => void;
  /** Repinta una capa entera (cambio de modo, de tema o de leyenda). */
  repaint: (layer: LayerId) => void;
  repaintAll: () => void;
}

export function createHighlight(
  scene: THREE.Scene,
  layers: Partial<Record<LayerId, PolyLayer | PointLayer>>,
  palette: () => ScenePalette,
): Highlight {
  let hover: Target | null = null;
  let selected: Target | null = null;
  const outline = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x0033ff, depthTest: false, transparent: true }),
  );
  outline.position.y = WORLD_LIFT;
  outline.renderOrder = 20;
  outline.visible = false;
  scene.add(outline);

  function colorFor(layer: PolyLayer | PointLayer, i: number): string {
    const base = layer.kind === 'poly' ? layer.options.color(i) : layer.color(i);
    const t = { layer: layer.id, index: i };
    const p = palette();
    if (sameTarget(selected, t)) return layer.kind === 'poly' ? mix(base, p.accent, 0.7) : p.accent;
    if (sameTarget(hover, t)) return mix(base, p.hover, layer.kind === 'poly' ? 0.4 : 0.6);
    return base;
  }

  function paint(t: Target | null) {
    if (!t) return;
    const layer = layers[t.layer];
    if (!layer) return;
    if (layer.kind === 'poly') paintPoly(layer, (i) => colorFor(layer, i), t.index);
    else paintPoints(layer, (i) => colorFor(layer, i), t.index);
  }

  function drawOutline() {
    const layer = selected ? layers[selected.layer] : undefined;
    if (!selected || !layer || layer.kind !== 'poly') {
      outline.visible = false;
      return;
    }
    const i = selected.index;
    outline.geometry.dispose();
    outline.geometry = ringLines([i], (k) => layer.shapes[k], (k) => layer.options.height(k) + layer.options.base(k) + 0.08);
    outline.visible = true;
  }

  function repaint(id: LayerId) {
    const layer = layers[id];
    if (!layer) return;
    if (layer.kind === 'poly') paintPoly(layer, (i) => colorFor(layer, i));
    else paintPoints(layer, (i) => colorFor(layer, i));
  }

  return {
    hovered: () => hover,
    selected: () => selected,
    setHover(t) {
      if (sameTarget(t, hover) || (t === null && hover === null)) return;
      const old = hover;
      hover = t;
      paint(old);
      paint(t);
    },
    setSelected(t) {
      const old = selected;
      selected = t;
      paint(old);
      paint(t);
      drawOutline();
    },
    repaint,
    repaintAll: () => (Object.keys(layers) as LayerId[]).forEach(repaint),
  };
}
