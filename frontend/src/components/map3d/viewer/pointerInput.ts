/**
 * Distingue un clic de un arrastre sobre el lienzo: los controles de cámara
 * usan el mismo puntero y un giro no debe seleccionar nada.
 */

/** Un clic que se desplaza más de esto es un arrastre, no una selección. */
const CLICK_TOLERANCE_PX = 6;

export interface PointerHandlers {
  onPress: () => void;
  onClick: (clientX: number, clientY: number) => void;
  /** Solo con ratón y sin botones pulsados: en táctil no hay «pasar por encima». */
  onHover: (clientX: number, clientY: number) => void;
}

export function bindPointer(dom: HTMLElement, handlers: PointerHandlers): () => void {
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => {
    downAt = [e.clientX, e.clientY];
    handlers.onPress();
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved <= CLICK_TOLERANCE_PX) handlers.onClick(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !e.buttons) handlers.onHover(e.clientX, e.clientY);
  };
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointermove', onMove);
  return () => {
    dom.removeEventListener('pointerdown', onDown);
    dom.removeEventListener('pointerup', onUp);
    dom.removeEventListener('pointermove', onMove);
  };
}
