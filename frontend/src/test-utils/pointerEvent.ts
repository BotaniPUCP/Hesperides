/**
 * jsdom no trae PointerEvent: sin él, fireEvent.pointerDown llega sin botón ni
 * coordenadas. Este basta para los gestos del mapa (botón, posición y puntero).
 */
export function installPointerEvent(): void {
  if (typeof window.PointerEvent === 'function') return;
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}
