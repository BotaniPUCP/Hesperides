import * as THREE from 'three';

export interface SelectionRectangle { left: number; top: number; right: number; bottom: number }

/** Test the projected center of a structure against the viewport rectangle. */
export function insideSelection(point: THREE.Vector3, camera: THREE.Camera, dom: HTMLElement, box: SelectionRectangle) {
  const projected = point.clone().project(camera), bounds = dom.getBoundingClientRect();
  const x = bounds.left + (projected.x + 1) * bounds.width / 2;
  const y = bounds.top + (1 - projected.y) * bounds.height / 2;
  return projected.z >= -1 && projected.z <= 1 && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/** Capture Ctrl-left drag before camera controls and commit only on release. */
export function bindModifiedSelection(dom: HTMLElement, onPick: (x: number, y: number) => void, onBox: (box: SelectionRectangle) => void) {
  let start: { x: number; y: number; id: number } | null = null;
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-label', 'Rectángulo de selección');
  Object.assign(overlay.style, { position: 'fixed', pointerEvents: 'none', border: '2px solid #f8a52b', background: 'rgba(248,165,43,0.18)', zIndex: '9999', display: 'none' });
  document.body.append(overlay);
  const rectangle = (x: number, y: number): SelectionRectangle => ({ left: Math.min(start!.x, x), top: Math.min(start!.y, y), right: Math.max(start!.x, x), bottom: Math.max(start!.y, y) });
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.ctrlKey || !event.isPrimary) return;
    event.preventDefault(); event.stopImmediatePropagation();
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dom.setPointerCapture(event.pointerId);
    Object.assign(overlay.style, { display: 'block', left: `${start.x}px`, top: `${start.y}px`, width: '0px', height: '0px' });
  };
  const move = (event: PointerEvent) => {
    if (start?.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const box = rectangle(event.clientX, event.clientY);
    Object.assign(overlay.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.right - box.left}px`, height: `${box.bottom - box.top}px` });
  };
  const up = (event: PointerEvent) => {
    if (start?.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const box = rectangle(event.clientX, event.clientY), previous = start;
    start = null; overlay.style.display = 'none';
    if (dom.hasPointerCapture(event.pointerId)) dom.releasePointerCapture(event.pointerId);
    if (event.type !== 'pointerup') return;
    if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 6) onPick(event.clientX, event.clientY);
    else onBox(box);
  };
  const blur = () => { if (start && dom.hasPointerCapture(start.id)) dom.releasePointerCapture(start.id); start = null; overlay.style.display = 'none'; };
  dom.addEventListener('pointerdown', down, true);
  dom.addEventListener('pointermove', move, true);
  dom.addEventListener('pointerup', up, true);
  dom.addEventListener('pointercancel', up, true);
  dom.addEventListener('lostpointercapture', blur);
  window.addEventListener('blur', blur);
  return () => {
    blur(); overlay.remove();
    dom.removeEventListener('pointerdown', down, true);
    dom.removeEventListener('pointermove', move, true);
    dom.removeEventListener('pointerup', up, true);
    dom.removeEventListener('pointercancel', up, true);
    dom.removeEventListener('lostpointercapture', blur);
    window.removeEventListener('blur', blur);
  };
}
