'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { GreenAreaSetElement } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { Button, LoadingSkeleton } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData, type SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';
import { useRectangleSelection } from '@/components/map3d/useRectangleSelection';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { contentsLabel, gardensLabel, specimensLabel } from './planningTexts';

/** Qué se elige para el conjunto: decide el clic, el rectángulo y lo que muestran las tarjetas. */
export type PickMode = 'GARDENS' | 'SPECIMENS' | 'BOTH';
const PICK_MODES: { value: PickMode; label: string }[] = [
  { value: 'GARDENS', label: 'Jardines' }, { value: 'SPECIMENS', label: 'Ejemplares' }, { value: 'BOTH', label: 'Ambos' },
];
const OUTSIDE = 'fuera';
/** Lo que se mueve el puntero antes de considerar que se arrastró el mapa y no que se hizo clic. */
const DRAG_PX = 6;
/** Acciones de la tarjeta: pequeñas para que quepan en una fila del panel. */
const CARD_ACTION = 'rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40';
/** Herramientas que flotan sobre el mapa. */
const TOOL_BASE = 'pointer-events-auto rounded-md border px-2.5 py-1.5 text-xs font-semibold shadow';
const TOOL = `${TOOL_BASE} border-neutral-200 bg-neutral-0 text-neutral-900 hover:bg-neutral-100`;
const MAP_CHIP = 'pointer-events-auto rounded-md bg-neutral-0 text-xs font-semibold text-neutral-900 shadow';

interface SectorGroup {
  key: string;
  name: string;
  sections: IrrigationZone[];
  specimens: GreenAreaSetElement[];
}

interface Notice {
  text: ReactNode;
  /** Si se puede deshacer lo que causó el aviso. */
  undo?: () => void;
}

export interface SetMapPickerProps {
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  specimens: GreenAreaSetElement[];
  selectedZoneIds: number[];
  selectedSpecimenIds: number[];
  onCancel: () => void;
  onConfirm: (zoneIds: number[], specimenIds: number[]) => void;
}

const matches = (text: string, term: string) =>
  text.toLocaleLowerCase('es').includes(term.trim().toLocaleLowerCase('es'));

/** El modo con que se abre: el que corresponde a lo que ya tiene el conjunto. */
function initialMode(zoneIds: number[], specimenIds: number[]): PickMode {
  if (specimenIds.length === 0) return 'GARDENS';
  return zoneIds.length === 0 ? 'SPECIMENS' : 'BOTH';
}

const sameIds = (a: Set<number>, b: number[]) => a.size === new Set(b).size && b.every((id) => a.has(id));

function Meter({ label, chosen, total }: { label: string; chosen: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((chosen / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-neutral-600">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-16 shrink-0 text-right ${chosen > 0 ? 'font-semibold text-brand-700' : 'text-neutral-500'}`}>{chosen} de {total}</span>
    </div>
  );
}

/**
 * Elegir lo que forma un conjunto: jardines, ejemplares o ambos, sobre el mapa o
 * en una tarjeta por sector. Es propio de Conjuntos para que el selector de Riego
 * (SectionMapPicker) no cambie.
 */
export function SetMapPicker({ sectors, sectionsBySector, specimens, selectedZoneIds, selectedSpecimenIds,
  onCancel, onConfirm }: SetMapPickerProps) {
  const { data: layers, isLoading, errorMessage, stale } = useMapLayers();
  const [zones, setZones] = useState<Set<number>>(() => new Set(selectedZoneIds));
  const [plants, setPlants] = useState<Set<number>>(() => new Set(selectedSpecimenIds));
  const [mode, setMode] = useState<PickMode>(() => initialMode(selectedZoneIds, selectedSpecimenIds));
  const [term, setTerm] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  /** Ctrl (o ⌘) apretado: el mapa deja de girar y el arrastre dibuja un rectángulo. */
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  /** Lo que la persona abrió o cerró a mano; si no tocó una tarjeta, se abre cuando tiene algo elegido. */
  const [openedByHand, setOpenedByHand] = useState<Map<string, boolean>>(new Map());
  /** Qué se está viendo en el mapa: «lo elegido en …» o el sector entero. */
  const [focusLabel, setFocusLabel] = useState('');
  const viewer = useRef<Viewer | null>(null);
  const mapRegion = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const cards = useRef(new Map<string, HTMLLIElement>());
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const pickGardens = mode !== 'SPECIMENS';
  const pickPlants = mode !== 'GARDENS';
  const dirty = !sameIds(zones, selectedZoneIds) || !sameIds(plants, selectedSpecimenIds);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  /** Un grupo por sector, en su orden, y al final los ejemplares que no están en ninguna sección. */
  const groups = useMemo<SectorGroup[]>(() => {
    const known = new Set(sectors.map((s) => s.id));
    const out: SectorGroup[] = sectors.map((s) => ({ key: String(s.id), name: s.name, sections: sectionsBySector[s.id] ?? [],
      specimens: specimens.filter((e) => e.sectorId === s.id) }));
    const outside = specimens.filter((e) => e.sectorId == null || !known.has(e.sectorId));
    if (outside.length) out.push({ key: OUTSIDE, name: 'Fuera de toda sección', sections: [], specimens: outside });
    return out;
  }, [sectors, sectionsBySector, specimens]);

  const sectionByCode = useMemo(() => new Map(groups.flatMap((g) => g.sections.map((s) => [s.code, { id: s.id, group: g }] as const))), [groups]);
  const specimenByCode = useMemo(() => new Map(groups.flatMap((g) => g.specimens.map((e) => [e.code, { id: e.id, group: g }] as const))), [groups]);
  const allSections = useMemo(() => groups.flatMap((g) => g.sections), [groups]);
  const markedCodes = useMemo(() => allSections.filter((s) => zones.has(s.id)).map((s) => s.code), [allSections, zones]);
  const markedPlantCodes = useMemo(() => specimens.filter((e) => plants.has(e.id)).map((e) => e.code), [specimens, plants]);

  useEffect(() => { viewer.current?.setMarkedSections(markedCodes); }, [markedCodes]);
  useEffect(() => { viewer.current?.setMarkedSpecimens(markedPlantCodes); }, [markedPlantCodes]);

  // Va dentro de la pantalla, con el menú a la vista: cancelar, un enlace del menú o «Atrás» avisan si se cambió algo.
  const guard = useUnsavedChangesGuard(dirty);
  const requestCancel = () => guard.confirm(onCancel);
  useEffect(() => { root.current?.scrollIntoView?.({ block: 'start' }); }, []);

  const unfocus = () => {
    setFocused(null);
    setNotice((n) => (n && !n.undo ? null : n));
  };

  /** Avisa, sin impedirlo, cuando se agrega algo de otro sector que el que se está viendo. */
  const warnIfOutside = useCallback((group: SectorGroup, adding: boolean) => {
    const current = groups.find((g) => g.key === focused);
    setNotice(adding && current && current.key !== group.key
      ? { text: `Agregaste algo de ${group.name}, fuera de ${current.name}, que es el sector que estás viendo.` } : null);
  }, [groups, focused]);

  const toggleIn = (set: Set<number>, id: number) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  /** Una tarjeta en la que se trabajó queda abierta, aunque se le quite todo, para no plegarse bajo el cursor. */
  const keepOpen = (key: string) => setOpenedByHand((prev) => (prev.has(key) ? prev : new Map(prev).set(key, true)));
  const toggleZone = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !zones.has(id)); keepOpen(group.key); setZones((prev) => toggleIn(prev, id));
  };
  const togglePlant = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !plants.has(id)); keepOpen(group.key); setPlants((prev) => toggleIn(prev, id));
  };
  const showCard = (key: string) => cards.current.get(key)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });

  const onMapPick = (target: Target | null, data: SceneData) => {
    // El visor deja un punto de ubicación tras el clic; al elegir no aplica, y se quita apenas termina.
    queueMicrotask(() => viewer.current?.select(null, false));
    if (!target) return;
    if (target.layer === 'vegetation') {
      if (!pickPlants) { setNotice({ text: <>Estás eligiendo jardines. Cambia a <strong>Ejemplares</strong> o <strong>Ambos</strong> para agregar ejemplares.</> }); return; }
      const hit = specimenByCode.get(data.vegetation[target.index]?.props.code);
      if (!hit) { setNotice({ text: 'Ese ejemplar no está disponible para conjuntos.' }); return; }
      togglePlant(hit.id, hit.group);
      showCard(hit.group.key);
      return;
    }
    if (!pickGardens) { setNotice({ text: <>Estás eligiendo ejemplares. Cambia a <strong>Jardines</strong> o <strong>Ambos</strong> para agregar jardines.</> }); return; }
    if (target.layer !== 'greenAreas' && target.layer !== 'xerophytic' && target.layer !== 'reserve') {
      setNotice({ text: 'Haz clic en un área verde, no en un edificio u otro elemento.' });
      return;
    }
    const hit = sectionByCode.get(data[target.layer][target.index]?.props.code);
    if (!hit) { setNotice({ text: 'Esa área no es un jardín disponible.' }); return; }
    toggleZone(hit.id, hit.group);
    showCard(hit.group.key);
  };

  /** Cambiar lo que se elige quita lo del otro tipo, y se puede deshacer. */
  const changeMode = (next: PickMode) => {
    if (next === mode) return;
    const before = { zones, plants, mode };
    const dropGardens = next === 'SPECIMENS' && zones.size > 0;
    const dropPlants = next === 'GARDENS' && plants.size > 0;
    setMode(next);
    if (dropGardens) setZones(new Set());
    if (dropPlants) setPlants(new Set());
    const count = dropGardens ? zones.size : plants.size;
    const removed = dropGardens ? gardensLabel(count) : dropPlants ? specimensLabel(count) : null;
    setNotice(removed ? {
      text: `${count === 1 ? 'Se quitó' : 'Se quitaron'} ${removed} al cambiar a ${next === 'GARDENS' ? 'Jardines' : 'Ejemplares'}.`,
      undo: () => { setZones(before.zones); setPlants(before.plants); setMode(before.mode); setNotice(null); },
    } : null);
  };

  const zoneOfCode = useMemo(() => new Map(allSections.map((s) => [s.code, s])), [allSections]);
  // Ctrl + arrastrar dibuja un rectángulo. Si todo lo que encierra ya estaba elegido, lo quita;
  // si no, agrega lo que falta. El hook es compartido con Riego y solo sabe «agregar»: aquí se
  // juntan los jardines y ejemplares que devuelve y se decide con los dos a la vez.
  const inRect = useRef<{ gardens: number[]; plants: number[] }>({ gardens: [], plants: [] });
  const onRectResult = (text: string) => {
    const { gardens, plants: trees } = inRect.current;
    inRect.current = { gardens: [], plants: [] };
    if (text.startsWith('Arrastra')) { setNotice({ text: 'Mantén Ctrl y arrastra un rectángulo sobre el mapa.' }); return; }
    if (gardens.length + trees.length === 0) { setNotice({ text: 'El rectángulo no encerró nada que se pueda elegir.' }); return; }
    const before = { zones, plants };
    const allChosen = gardens.every((id) => zones.has(id)) && trees.every((id) => plants.has(id));
    if (allChosen) {
      const dropZones = new Set(gardens);
      const dropPlants = new Set(trees);
      setZones(new Set([...zones].filter((id) => !dropZones.has(id))));
      setPlants(new Set([...plants].filter((id) => !dropPlants.has(id))));
      setNotice({ text: `Se quitó del conjunto: ${contentsLabel(gardens.length, trees.length)}.`,
        undo: () => { setZones(before.zones); setPlants(before.plants); setNotice(null); } });
      return;
    }
    const newGardens = gardens.filter((id) => !zones.has(id));
    const newPlants = trees.filter((id) => !plants.has(id));
    setZones(new Set([...zones, ...newGardens]));
    setPlants(new Set([...plants, ...newPlants]));
    setNotice({ text: `Se agregó al conjunto: ${contentsLabel(newGardens.length, newPlants.length)}. Arrastra otra vez sobre lo mismo para quitarlo.` });
  };
  const { drag, beginDrag, moveDrag, endDrag, cancelDrag } = useRectangleSelection({
    mapRegion, viewer, permittedCodes: pickGardens ? allSections.map((s) => s.code) : [], sectionsByCode: zoneOfCode,
    onAdd: (ids) => { inRect.current.gardens = ids; }, onNotice: onRectResult,
    specimens: pickPlants ? { eligible: specimens.map((e) => e.code), byCode: new Map(specimens.map((e) => [e.code, e.id])),
      onAdd: (ids) => { inRect.current.plants = ids; } } : undefined,
  });
  /** La capa del rectángulo sigue mientras se arrastra, aunque se suelte Ctrl antes de soltar el clic. */
  const selecting = (ctrlHeld || drag !== null) && Boolean(scene) && !unsupported;
  const startArea = (e: ReactPointerEvent<HTMLDivElement>) => { inRect.current = { gardens: [], plants: [] }; beginDrag(e); };
  useEffect(() => {
    const track = (e: KeyboardEvent) => setCtrlHeld(e.ctrlKey || e.metaKey);
    const release = () => setCtrlHeld(false);
    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', track);
      window.removeEventListener('keyup', track);
      window.removeEventListener('blur', release);
    };
  }, []);
  /**
   * La capa de la selección múltiple tapa el mapa para dibujar el rectángulo, y así también se
   * comía la rueda: se la pasa al lienzo del mapa para que acercar y alejar siga funcionando.
   * Va como escucha nativa no pasiva, para que la rueda no desplace además la página.
   */
  const areaLayer = useCallback((layer: HTMLDivElement | null) => {
    if (!layer) return;
    const forward = (e: WheelEvent) => {
      const canvas = mapRegion.current?.querySelector('canvas');
      if (!canvas) return;
      e.preventDefault();
      canvas.dispatchEvent(new WheelEvent('wheel', e));
    };
    layer.addEventListener('wheel', forward, { passive: false });
    return () => layer.removeEventListener('wheel', forward);
  }, []);

  // Mover o acercar el mapa a mano deja de «ver» el sector enfocado; un clic no.
  const onMapPointerDown = (e: ReactPointerEvent) => { pointerStart.current = selecting ? null : { x: e.clientX, y: e.clientY }; };
  const onMapPointerUp = (e: ReactPointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start && focused && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_PX) unfocus();
  };

  const markGardens = (g: SectorGroup) => { keepOpen(g.key); setZones((prev) => new Set([...prev, ...g.sections.map((s) => s.id)])); };
  const markPlants = (g: SectorGroup) => { keepOpen(g.key); setPlants((prev) => new Set([...prev, ...g.specimens.map((e) => e.id)])); };
  const clearGroup = (g: SectorGroup) => {
    keepOpen(g.key);
    const ids = new Set(g.sections.map((s) => s.id));
    const plantIds = new Set(g.specimens.map((e) => e.id));
    setZones((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    setPlants((prev) => new Set([...prev].filter((id) => !plantIds.has(id))));
  };
  /** Encuadra lo elegido del sector; si no hay nada elegido, el sector entero. */
  const look = (g: SectorGroup) => {
    if (focused === g.key) { unfocus(); return; }
    const chosenSections = g.sections.filter((s) => zones.has(s.id));
    const chosenPlants = g.specimens.filter((e) => plants.has(e.id));
    const anyChosen = chosenSections.length + chosenPlants.length > 0;
    setFocused(g.key);
    setFocusLabel(anyChosen ? `lo elegido en ${g.name}` : g.name);
    setNotice((n) => (n && !n.undo ? null : n));
    setOpenedByHand((prev) => new Map(prev).set(g.key, true));
    viewer.current?.focusSections(
      (anyChosen ? chosenSections : pickGardens ? g.sections : []).map((s) => s.code),
      (anyChosen ? chosenPlants : pickPlants ? g.specimens : []).map((e) => e.code));
  };
  const toggleOpen = (key: string, open: boolean) => setOpenedByHand((prev) => new Map(prev).set(key, !open));
  const searching = term.trim() !== '';
  const focusedGroup = groups.find((g) => g.key === focused);

  return (
    <section ref={root} aria-labelledby="set-picker-title"
      className="flex h-[calc(100vh-9rem)] min-h-[560px] scroll-mt-4 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 text-neutral-900 shadow-xs">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0 flex-1"><h2 id="set-picker-title" className="text-lg font-bold">Elegir jardines y ejemplares del conjunto</h2>
          <p className="text-xs text-neutral-500">Lo elegido se guarda cuando guardes el conjunto.</p></div>
        <button type="button" onClick={requestCancel}
          className="shrink-0 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancelar y volver</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div ref={mapRegion} role="region" aria-label="Mapa del campus" className="relative min-h-[250px] flex-[2] overflow-hidden bg-neutral-100 md:min-h-0"
          onPointerDownCapture={onMapPointerDown} onPointerUpCapture={onMapPointerUp}
          onWheelCapture={() => { if (focused && !selecting) unfocus(); }}>
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView data={scene}
              onReady={(v) => { viewer.current = v; v.setMarkedSections(markedCodes); v.setMarkedSpecimens(markedPlantCodes); v.setLayerVisible('supervision', false); }}
              onUnsupported={() => setUnsupported(true)}
              onSelect={(target) => { if (!selecting) onMapPick(target, scene); }}
              onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined} />
              : <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="font-semibold">Mapa 3D no disponible</p>
                <p className="mt-2 max-w-sm text-sm text-neutral-500">{errorMessage ?? 'El navegador no admite WebGL. Puedes elegir todo en las tarjetas de cada sector.'}</p>
              </div>}
          {/* Las herramientas flotan sobre el mapa; el modo va siempre, aunque no haya mapa: decide qué muestran las tarjetas. */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col items-start gap-2">
            <div className="flex w-full flex-wrap items-start justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {scene && !unsupported && !isLoading && <>
                  <button className={TOOL} type="button" onClick={() => { unfocus(); viewer.current?.top(); }}>Vista superior</button>
                  <button className={TOOL} type="button" onClick={() => { unfocus(); viewer.current?.fit(); }}>Ver campus</button>
                  {/* Cómo elegir varios, siempre a la vista: no hay botón que active un modo. */}
                  <span className={`${MAP_CHIP} px-2.5 py-1.5 font-medium text-neutral-600`}>
                    <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-sans">Ctrl</kbd> + arrastrar: elegir o quitar varios
                  </span>
                </>}
              </div>
              {/* Decide qué agregan el clic y el rectángulo, y qué muestran las tarjetas. Va aparte para que la etiqueta no parezca otra opción. */}
              <div className={`${MAP_CHIP} flex items-center gap-2 border border-neutral-200 py-0.5 pl-2.5 pr-0.5`}>
                <span id="set-picker-mode" className="font-medium text-neutral-600">Elegir:</span>
                <div role="radiogroup" aria-labelledby="set-picker-mode" className="flex">
                  {PICK_MODES.map((m) => (
                    <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => changeMode(m.value)}
                      className={`rounded px-2 py-1 ${mode === m.value ? 'bg-brand-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {focusedGroup && <div className={`${MAP_CHIP} flex items-center gap-2 py-1 pl-3 pr-1`}>
              <span>Viendo {focusLabel}</span>
              <button type="button" onClick={unfocus} aria-label={`Dejar de ver ${focusedGroup.name}`}
                className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">✕</button>
            </div>}
          </div>
          {selecting && <div ref={areaLayer} className="absolute inset-0 z-20 cursor-crosshair touch-none"
            aria-label="Dibuja un rectángulo para elegir o quitar lo que encierre"
            onPointerDown={startArea} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
            {drag && <div className="pointer-events-none absolute border-2 border-brand-700 bg-brand-200/30"
              style={{ left: Math.min(drag.startX, drag.endX) - drag.originX, top: Math.min(drag.startY, drag.endY) - drag.originY,
                width: Math.abs(drag.endX - drag.startX), height: Math.abs(drag.endY - drag.startY) }} />}
          </div>}
          {stale && <div className="absolute bottom-10 left-3 z-30 max-w-xs rounded-md bg-alert-warning-bg p-2 text-xs text-alert-warning-fg">Mapa almacenado sin conexión; verifica la selección.</div>}
          {layers && <div className="pointer-events-none absolute bottom-2 left-3 z-30"><MapAttribution required={layers.attributionRequired} /></div>}
        </div>

        <aside className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 bg-neutral-50 md:min-w-[360px] md:max-w-[440px] md:border-l md:border-t-0">
          <div className="shrink-0 space-y-3 border-b border-neutral-200 bg-neutral-0 p-4">
            <div className="flex items-center justify-between gap-2">
              <span aria-live="polite" className="text-sm font-semibold text-neutral-900">
                {zones.size + plants.size === 0 ? 'Nada elegido todavía' : `Elegido: ${contentsLabel(zones.size, plants.size)}`}
              </span>
              <button type="button" className={`${CARD_ACTION} whitespace-nowrap`} disabled={zones.size + plants.size === 0}
                onClick={() => { setZones(new Set()); setPlants(new Set()); setNotice(null); }}>Quitar todo</button>
            </div>
            <label htmlFor="set-picker-search" className="sr-only">Buscar jardín o ejemplar</label>
            <input id="set-picker-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)}
              placeholder={mode === 'GARDENS' ? 'Buscar jardín o código' : mode === 'SPECIMENS' ? 'Buscar especie o código' : 'Buscar jardín, especie o código'}
              className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900" />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} /> Ver solo lo elegido</label>
            {notice && <div role="status" className="flex items-start justify-between gap-2 rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">
              <span>{notice.text}</span>
              {notice.undo && <button type="button" onClick={notice.undo} className="shrink-0 font-semibold underline underline-offset-2">Deshacer</button>}
            </div>}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-label="Sectores">
            {groups.map((g) => {
              const ownGardens = pickGardens ? g.sections : [];
              const ownTrees = pickPlants ? g.specimens : [];
              if (ownGardens.length + ownTrees.length === 0) return null;
              const gardens = ownGardens.filter((s) => (!onlySelected || zones.has(s.id)) && matches(`${s.name} ${s.code}`, term));
              const trees = ownTrees.filter((e) => (!onlySelected || plants.has(e.id)) && matches(`${e.displayName} ${e.code} ${e.sectionName ?? ''}`, term));
              if ((searching || onlySelected) && gardens.length + trees.length === 0) return null;
              const chosenGardens = ownGardens.filter((s) => zones.has(s.id)).length;
              const chosenTrees = ownTrees.filter((e) => plants.has(e.id)).length;
              const chosen = chosenGardens + chosenTrees;
              const open = searching || (openedByHand.get(g.key) ?? chosen > 0);
              const isFocused = focused === g.key;
              return (
                <li key={g.key} aria-label={g.name} ref={(el) => { if (el) cards.current.set(g.key, el); else cards.current.delete(g.key); }}
                  className={`overflow-hidden rounded-xl border bg-neutral-0 ${isFocused ? 'border-brand-600 ring-1 ring-brand-600' : 'border-neutral-200'}`}>
                  <div className={`flex items-center justify-between gap-2 px-3 py-2 ${chosen > 0 ? 'bg-brand-50' : 'bg-neutral-0'}`}>
                    <button type="button" aria-expanded={open} onClick={() => toggleOpen(g.key, open)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-neutral-900">
                      <span aria-hidden="true" className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                      <span className="truncate" title={g.name}>{g.name}</span>
                    </button>
                    {chosen > 0 && <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{contentsLabel(chosenGardens, chosenTrees)}</span>}
                  </div>
                  <div className="space-y-1.5 px-3 pb-2 pt-1">
                    {ownGardens.length > 0 && <Meter label="Jardines" chosen={chosenGardens} total={ownGardens.length} />}
                    {ownTrees.length > 0 && <Meter label="Ejemplares" chosen={chosenTrees} total={ownTrees.length} />}
                  </div>
                  {open && (
                    <div className="space-y-3 border-t border-neutral-200 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ownGardens.length > 0 && <button type="button" className={CARD_ACTION}
                          disabled={chosenGardens === ownGardens.length} onClick={() => markGardens(g)}>Marcar jardines</button>}
                        {ownTrees.length > 0 && <button type="button" className={CARD_ACTION}
                          disabled={chosenTrees === ownTrees.length} onClick={() => markPlants(g)}>Marcar ejemplares</button>}
                        <button type="button" className={CARD_ACTION} disabled={chosen === 0} onClick={() => clearGroup(g)}>Quitar del sector</button>
                        <button type="button" onClick={() => look(g)} aria-pressed={isFocused}
                          title={chosen > 0 ? 'Encuadra lo elegido en este sector' : 'Encuadra el sector entero'}
                          className="ml-auto whitespace-nowrap text-xs font-medium text-brand-700 underline underline-offset-2">
                          {isFocused ? 'Dejar de ver' : 'Ver en el mapa'}</button>
                      </div>
                      <div className="max-h-64 space-y-3 overflow-y-auto">
                        {gardens.length > 0 && <fieldset className="space-y-1"><legend className="text-xs font-medium text-neutral-500">Jardines</legend>
                          {gardens.map((s) => <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-neutral-50">
                            <input type="checkbox" checked={zones.has(s.id)} onChange={() => toggleZone(s.id, g)} />
                            <span className="font-medium text-neutral-900">{s.name}</span>{s.name !== s.code && <span className="text-xs text-neutral-500">{s.code}</span>}
                          </label>)}</fieldset>}
                        {trees.length > 0 && <fieldset className="space-y-1"><legend className="text-xs font-medium text-neutral-500">Ejemplares</legend>
                          {trees.map((e) => <label key={e.id} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-neutral-50">
                            <input type="checkbox" className="mt-1" checked={plants.has(e.id)} onChange={() => togglePlant(e.id, g)} />
                            <span className="min-w-0"><span className="block font-medium text-neutral-900">{e.displayName}</span>
                              <span className="block text-xs text-neutral-500">{e.code}{e.sectionName ? ` · ${e.sectionName}` : ''}</span></span>
                          </label>)}</fieldset>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <footer className="shrink-0 border-t border-neutral-200 bg-neutral-0 p-4">
            <Button type="button" fullWidth onClick={() => onConfirm(allSections.filter((s) => zones.has(s.id)).map((s) => s.id),
              specimens.filter((e) => plants.has(e.id)).map((e) => e.id))}>
              {zones.size + plants.size === 0 ? 'Confirmar sin elementos' : `Confirmar ${contentsLabel(zones.size, plants.size)}`}
            </Button>
          </footer>
        </aside>
      </div>
      {guard.dialog}
    </section>
  );
}
