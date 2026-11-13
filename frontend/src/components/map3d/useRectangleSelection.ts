import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { IrrigationZone } from '@shared/types/irrigation';
import type { Viewer } from './viewer/createViewer';

/** Coordenadas de cliente más el origen del mapa, leído al empezar: el render no toca refs. */
export interface DragBox { startX: number; startY: number; endX: number; endY: number; originX: number; originY: number; }

/** Por debajo de este tamaño, en píxeles, un arrastre se toma como un clic. */
const MIN_DRAG_PX = 7;

interface Options {
  mapRegion: RefObject<HTMLDivElement | null>;
  viewer: RefObject<Viewer | null>;
  permittedCodes: string[];
  sectionsByCode: Map<string, IrrigationZone>;
  onAdd: (ids: number[]) => void;
  onNotice: (notice: string) => void;
  /** Si se pasa, el rectángulo también agrega los ejemplares elegibles que encierra. */
  specimens?: { eligible: string[]; byCode: Map<string, number>; onAdd: (ids: number[]) => void };
}

/**
 * Selección por rectángulo sobre el mapa. Solo activa secciones realmente
 * dibujadas: el visor proyecta la geometría de cada sección, no estima por filas.
 */
export function useRectangleSelection({ mapRegion, viewer, permittedCodes, sectionsByCode, onAdd, onNotice, specimens }: Options) {
  const [drag, setDrag] = useState<DragBox | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  function beginDrag(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY };
    const origin = mapRegion.current?.getBoundingClientRect();
    setDrag({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY, originX: origin?.left ?? 0, originY: origin?.top ?? 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setDrag((prev) => prev && { ...prev, endX: e.clientX, endY: e.clientY });
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const a = dragStart.current;
    dragStart.current = null;
    setDrag(null);
    if (Math.abs(e.clientX - a.x) < MIN_DRAG_PX || Math.abs(e.clientY - a.y) < MIN_DRAG_PX) {
      onNotice('Arrastra un rectángulo sobre las áreas verdes para agregarlas.');
      return;
    }
    const codes = permittedCodes.length ? viewer.current?.sectionCodesInScreenRect(a.x, a.y, e.clientX, e.clientY, permittedCodes) ?? [] : [];
    const ids = codes.map((code) => sectionsByCode.get(code)?.id).filter((id): id is number => id !== undefined);
    const plantCodes = specimens ? viewer.current?.specimenCodesInScreenRect(a.x, a.y, e.clientX, e.clientY, specimens.eligible) ?? [] : [];
    const plantIds = plantCodes.map((code) => specimens?.byCode.get(code)).filter((id): id is number => id !== undefined);
    if (!specimens) {
      if (!ids.length) { onNotice('El rectángulo no incluyó secciones disponibles. Amplía el área o usa el buscador.'); return; }
      onAdd(ids);
      onNotice(`Se añadieron ${ids.length} secciones dentro del área dibujada (puedes desmarcarlas en la lista).`);
      return;
    }
    if (!ids.length && !plantIds.length) { onNotice('El rectángulo no incluyó nada disponible. Amplía el área o usa el buscador.'); return; }
    if (ids.length) onAdd(ids);
    if (plantIds.length) specimens.onAdd(plantIds);
    onNotice(`Se añadieron ${ids.length} jardines y ${plantIds.length} ejemplares del área dibujada (puedes desmarcarlos en la lista).`);
  }

  function cancelDrag() {
    dragStart.current = null;
    setDrag(null);
  }

  return { drag, beginDrag, moveDrag, endDrag, cancelDrag };
}
