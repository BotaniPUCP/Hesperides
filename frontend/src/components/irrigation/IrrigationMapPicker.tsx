'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { IrrigationZone } from '@shared/types/irrigation';
import { Button, LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData, type SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';

const ALL = 'ALL';
const FIELD = 'h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900';

interface Props {
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  scope: string;
  selectedIds: number[];
  onCancel: () => void;
  onConfirm: (ids: number[]) => void;
}

/** Coordenadas de cliente más el origen del mapa, leído al empezar: el render no toca refs. */
interface DragBox { startX: number; startY: number; endX: number; endY: number; originX: number; originY: number; }

/** Seleccion multiple por IDs autorizados, con mapa + lista siempre sincronizados. */
export function IrrigationMapPicker({ sectors, sectionsBySector, scope, selectedIds, onCancel, onConfirm }: Props) {
  const { data: layers, isLoading, errorMessage, stale } = useMapLayers();
  const [chosenScope, setChosenScope] = useState(scope);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectedIds));
  const [term, setTerm] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [drag, setDrag] = useState<DragBox | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const mapRegion = useRef<HTMLDivElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  const scopedSectors = useMemo(() => sectors.filter((s) => chosenScope === ALL || chosenScope === String(s.id)), [sectors, chosenScope]);
  const allSections = useMemo(() => sectors.flatMap((s) => sectionsBySector[s.id] ?? []), [sectors, sectionsBySector]);
  const scopeSections = useMemo(() => scopedSectors.flatMap((s) => sectionsBySector[s.id] ?? []), [scopedSectors, sectionsBySector]);
  const sectionsByCode = useMemo(() => new Map(scopeSections.map((s) => [s.code, s])), [scopeSections]);
  const permittedCodes = useMemo(() => scopeSections.map((s) => s.code), [scopeSections]);
  const markedCodes = useMemo(() => allSections.filter((s) => selected.has(s.id)).map((s) => s.code), [allSections, selected]);
  const shown = useMemo(() => scopeSections.filter((s) =>
    (!onlySelected || selected.has(s.id)) &&
    `${s.name} ${s.code}`.toLocaleLowerCase('es').includes(term.trim().toLocaleLowerCase('es')),
  ), [scopeSections, selected, onlySelected, term]);

  useEffect(() => { viewer.current?.setMarkedSections(markedCodes); }, [markedCodes]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    firstButton.current?.focus();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelRef.current(); };
    document.addEventListener('keydown', handleEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = oldOverflow; };
  }, []);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setNotice(null);
  }, []);

  const onMapPick = (target: Target | null, data: SceneData) => {
    viewer.current?.select(null, false);
    if (!target) return;
    if (target.layer !== 'greenAreas' && target.layer !== 'xerophytic' && target.layer !== 'reserve') {
      setNotice('Haz clic en un área verde, no en un edificio u otro elemento.');
      return;
    }
    const code = data[target.layer][target.index]?.props.code;
    const section = code ? sectionsByCode.get(code) : null;
    if (!section) { setNotice('Sección fuera de tus sectores autorizados o del ámbito seleccionado.'); return; }
    toggle(section.id);
  };

  const allInScope = () => {
    const missing = scopeSections.filter((s) => !selected.has(s.id));
    if (missing.length === 0) return;
    if (!window.confirm(`¿Confirmas marcar ${missing.length} secciones adicionales como regadas? Esta operación solo selecciona: no guarda el turno.`)) return;
    setSelected((prev) => new Set([...prev, ...scopeSections.map((s) => s.id)]));
  };

  const clearScope = () => {
    const scoped = new Set(scopeSections.map((s) => s.id));
    setSelected((prev) => new Set([...prev].filter((id) => !scoped.has(id))));
  };

  // El rectangulo solo activa una seleccion de areas realmente dibujadas en el mapa,
  // no una estimacion por filas: el visor proyecta geometria de cada seccion.
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
    if (Math.abs(e.clientX - a.x) < 7 || Math.abs(e.clientY - a.y) < 7) {
      setNotice('Arrastra un rectángulo sobre las áreas verdes para agregarlas.');
      return;
    }
    const codes = viewer.current?.sectionCodesInScreenRect(a.x, a.y, e.clientX, e.clientY, permittedCodes) ?? [];
    const ids = codes.map((code) => sectionsByCode.get(code)?.id).filter((id): id is number => id !== undefined);
    if (!ids.length) { setNotice('El rectángulo no incluyó secciones disponibles. Amplía el área o usa el buscador.'); return; }
    setSelected((prev) => new Set([...prev, ...ids]));
    setNotice(`Se añadieron ${ids.length} secciones dentro del área dibujada (puedes desmarcarlas en la lista).`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="riego-mapa-titulo" className="fixed inset-0 z-[100] flex flex-col bg-neutral-0 text-neutral-900">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div><h2 id="riego-mapa-titulo" className="text-lg font-bold">Seleccionar secciones de riego · Mapa 3D</h2>
          <p className="text-xs text-neutral-500">Selecciona una o varias secciones, por sector o en conjunto. Confirmar no guarda aún en la base.</p></div>
        <button ref={firstButton} type="button" onClick={onCancel}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancelar y volver ✕</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div ref={mapRegion} className="relative min-h-[250px] flex-[2] overflow-hidden bg-neutral-100 md:min-h-0">
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView
              data={scene}
              onReady={(v) => { viewer.current = v; v.setMarkedSections(markedCodes); v.setLayerVisible('supervision', false); }}
              onUnsupported={() => setUnsupported(true)}
              onSelect={(target) => { if (!areaMode) onMapPick(target, scene); }}
              onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined}/>
              : <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="font-semibold">Mapa 3D no disponible</p>
                <p className="mt-2 max-w-sm text-sm text-neutral-500">{errorMessage ?? 'El navegador no admite WebGL. Puedes realizar toda la selección usando la lista lateral.'}</p>
              </div>}
          {scene && !unsupported && !isLoading && <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-wrap gap-2">
            <button className="pointer-events-auto rounded-md bg-neutral-0 px-3 py-2 text-xs font-semibold shadow" type="button" onClick={() => { viewer.current?.top(); setAreaMode(true); }}>Vista superior</button>
            <button className="pointer-events-auto rounded-md bg-neutral-0 px-3 py-2 text-xs font-semibold shadow" type="button" onClick={() => viewer.current?.fit()}>Ver campus</button>
            <button className={`pointer-events-auto rounded-md px-3 py-2 text-xs font-semibold shadow ${areaMode ? 'bg-brand-600 text-white' : 'bg-neutral-0 text-neutral-900'}`}
              type="button" onClick={() => { viewer.current?.top(); setAreaMode((v) => !v); }}> {areaMode ? '✓ Área activa · salir' : '▭ Selección rectangular'} </button>
          </div>}
          {areaMode && scene && !unsupported && <div className="absolute inset-0 z-20 cursor-crosshair touch-none"
            aria-label="Dibuja un rectángulo sobre el mapa para seleccionar secciones"
            onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { dragStart.current = null; setDrag(null); }}>
              {drag && <div className="pointer-events-none absolute border-2 border-brand-700 bg-brand-200/30"
                style={{ left: Math.min(drag.startX, drag.endX) - drag.originX,
                  top: Math.min(drag.startY, drag.endY) - drag.originY,
                  width: Math.abs(drag.endX - drag.startX), height: Math.abs(drag.endY - drag.startY) }}/>}
            </div>}
          {stale && <div className="absolute bottom-10 left-3 z-30 max-w-xs rounded-md bg-alert-warning-bg p-2 text-xs text-alert-warning-fg">Mapa almacenado sin conexión; verifica la selección.</div>}
          {layers && <div className="pointer-events-none absolute bottom-2 left-3 z-30"><MapAttribution required={layers.attributionRequired}/></div>}
        </div>
        <aside className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 md:max-w-[400px] md:border-l md:border-t-0">
          <div className="shrink-0 space-y-3 border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">Áreas regadas</strong>
              <span aria-live="polite" className="rounded-md bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-700">{selected.size} seleccionadas</span></div>
            <label className="block space-y-1 text-sm text-neutral-700"><span>Sector</span>
              <select className={FIELD} value={chosenScope} onChange={(e) => setChosenScope(e.target.value)}>
                <option value={ALL}>Todos mis sectores ({allSections.length})</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} ({sectionsBySector[s.id]?.length ?? 0})</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={allInScope}>Marcar todas</Button>
              <Button type="button" size="sm" variant="secondary" onClick={clearScope}>Limpiar ámbito</Button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
              {scopedSectors.map((s) => <span key={s.id}>{s.name}: {(sectionsBySector[s.id] ?? []).filter((z) => selected.has(z.id)).length}</span>)}
            </div>
            <label htmlFor="riego-mapa-buscar" className="sr-only">Buscar sección</label>
            <input id="riego-mapa-buscar" type="search" className={FIELD} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar sección o código" />
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)}/> Ver solo seleccionadas</label>
            {notice && <p role="status" className="rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">{notice}</p>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Secciones autorizadas">
            {shown.length === 0 ? <p className="p-3 text-sm text-neutral-500">No hay secciones que coincidan.</p>
              : shown.map((s) => <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-neutral-50">
                <input type="checkbox" className="mt-1 accent-cyan-600" checked={selected.has(s.id)} onChange={() => toggle(s.id)}/>
                <span><span className="block font-medium text-neutral-900">{s.name}</span><span className="text-xs text-neutral-500">{s.code}</span></span>
              </label>)}
          </div>
          <footer className="shrink-0 border-t border-neutral-200 p-4">
            <Button type="button" fullWidth onClick={() => onConfirm(allSections.filter((s) => selected.has(s.id)).map((s) => s.id))}>
              Confirmar selección de {selected.size} secciones
            </Button>
          </footer>
        </aside>
      </div>
    </div>
  );
}
