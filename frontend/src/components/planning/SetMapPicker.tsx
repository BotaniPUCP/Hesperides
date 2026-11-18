'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GreenAreaSetElement } from '@shared/types';
import type { ZoneOption } from '@shared/types';
import { Button, LoadingSkeleton } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData, type SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';
import { useCtrlRectangle, type RectangleAction, type ScreenRect } from '@/components/map3d/useCtrlRectangle';
import { useSweepHint } from '@/components/map3d/useSweepHint';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { contentsLabel, gardensLabel, specimensLabel } from './planningTexts';

/** Qué se elige para el conjunto: decide el clic, el rectángulo y lo que muestran las tarjetas. */
export type PickMode = 'GARDENS' | 'SPECIMENS' | 'BOTH';
const PICK_MODES: { value: PickMode; label: string }[] = [
  { value: 'GARDENS', label: 'Jardines' }, { value: 'SPECIMENS', label: 'Ejemplares' }, { value: 'BOTH', label: 'Ambos' },
];
const OUTSIDE = 'fuera';
/** Las flechas que recorren los sectores. */
/** Los mapas de Conjuntos nacen en colores reales, como el mapa principal (SPEC-112 D-13). */
const REAL_COLORS = { realColors: true };
const STEP = 'rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40';
/** Acciones de la tarjeta: pequeñas para que quepan en una fila del panel. */
const CARD_ACTION = 'rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40';
/** Herramientas que flotan sobre el mapa. */
const TOOL_BASE = 'pointer-events-auto rounded-md border px-2.5 py-1.5 text-xs font-semibold shadow';
const TOOL = `${TOOL_BASE} border-neutral-200 bg-neutral-0 text-neutral-900 hover:bg-neutral-100`;
const MAP_CHIP = 'pointer-events-auto rounded-md bg-neutral-0 text-xs font-semibold text-neutral-900 shadow';

interface SectorGroup {
  key: string;
  name: string;
  sections: ZoneOption[];
  specimens: GreenAreaSetElement[];
}

interface Notice {
  text: ReactNode;
  /** Si se puede deshacer lo que causó el aviso. */
  undo?: () => void;
}

export interface SetMapPickerProps {
  sectors: ZoneOption[];
  sectionsBySector: Record<number, ZoneOption[]>;
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
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** El sector que se recorre con las flechas: se encuadra, se pinta tenue y su tarjeta muestra todo lo que tiene. */
  const [focused, setFocused] = useState<string | null>(null);
  /** La tarjeta iluminada: la del sector donde se eligió o quitó algo por última vez, o al que se llegó. */
  const [lit, setLit] = useState<string | null>(null);
  /** Lo que la persona abrió o cerró a mano; si no tocó una tarjeta, se abre cuando tiene algo elegido. */
  const [openedByHand, setOpenedByHand] = useState<Map<string, boolean>>(new Map());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const viewer = useRef<Viewer | null>(null);
  const mapRegion = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const cards = useRef(new Map<string, HTMLLIElement>());

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

  /** Avisa, sin impedirlo, cuando se agrega algo de otro sector que el que se está viendo. */
  const warnIfOutside = useCallback((group: SectorGroup, adding: boolean) => {
    const current = groups.find((g) => g.key === focused);
    setNotice(adding && current && current.key !== group.key
      ? { text: `Agregaste algo de ${group.name}, fuera de ${current.name}, que es el sector que estás viendo.` } : null);
  }, [groups, focused]);

  const toggleIn = (set: Set<number>, id: number) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  /** Una tarjeta en la que se trabajó queda abierta, aunque se le quite todo, para no plegarse bajo el cursor. */
  const keepOpen = (key: string) => setOpenedByHand((prev) => (prev.has(key) ? prev : new Map(prev).set(key, true)));
  const showCard = (key: string) => cards.current.get(key)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  /** Ilumina la tarjeta del sector donde se eligió algo, para que se sepa de cuál es, y la trae a la vista. */
  const light = (key: string) => { setLit(key); queueMicrotask(() => showCard(key)); };
  /** Lo marcado o desmarcado uno a uno sigue en su tarjeta aunque deje de estar elegido: no se esconde bajo el cursor. */
  const touch = (key: string) => setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  const toggleZone = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !zones.has(id)); keepOpen(group.key); light(group.key); touch(`z${id}`); setZones((prev) => toggleIn(prev, id));
  };
  const togglePlant = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !plants.has(id)); keepOpen(group.key); light(group.key); touch(`e${id}`); setPlants((prev) => toggleIn(prev, id));
  };

  const onMapPick = (target: Target | null, data: SceneData) => {
    // El visor deja un punto de ubicación tras el clic; al elegir no aplica, y se quita apenas termina.
    queueMicrotask(() => viewer.current?.select(null, false));
    if (!target) return;
    if (target.layer === 'vegetation') {
      if (!pickPlants) { setNotice({ text: <>Estás eligiendo jardines. Cambia a <strong>Ejemplares</strong> o <strong>Ambos</strong> para agregar ejemplares.</> }); return; }
      const hit = specimenByCode.get(data.vegetation[target.index]?.props.code);
      if (!hit) { setNotice({ text: 'Ese ejemplar no está disponible para conjuntos.' }); return; }
      togglePlant(hit.id, hit.group);
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

  /** Ctrl + clic izquierdo agrega lo que encierra el rectángulo; Ctrl + clic derecho lo quita (se puede deshacer). */
  const onRectangle = ({ x1, y1, x2, y2 }: ScreenRect, action: RectangleAction) => {
    const v = viewer.current;
    if (!v) return;
    const gardenCodes = pickGardens ? v.sectionCodesInScreenRect(x1, y1, x2, y2, allSections.map((s) => s.code)) : [];
    const plantCodes = pickPlants ? v.specimenCodesInScreenRect(x1, y1, x2, y2, specimens.map((e) => e.code)) : [];
    const gardens = gardenCodes.map((code) => sectionByCode.get(code)?.id).filter((id): id is number => id !== undefined);
    const trees = plantCodes.map((code) => specimenByCode.get(code)?.id).filter((id): id is number => id !== undefined);
    if (gardens.length + trees.length === 0) { setNotice({ text: 'El rectángulo no encerró nada que se pueda elegir.' }); return; }
    // Se ilumina el sector con más de lo que tocó el rectángulo.
    const touched = new Map<string, number>();
    [...gardenCodes.map((c) => sectionByCode.get(c)?.group.key), ...plantCodes.map((c) => specimenByCode.get(c)?.group.key)]
      .forEach((key) => { if (key) touched.set(key, (touched.get(key) ?? 0) + 1); });
    const mostTouched = [...touched.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (mostTouched) { keepOpen(mostTouched); light(mostTouched); }
    if (action === 'add') {
      const newGardens = gardens.filter((id) => !zones.has(id));
      const newPlants = trees.filter((id) => !plants.has(id));
      if (newGardens.length + newPlants.length === 0) { setNotice({ text: 'Ya estaba todo elegido.' }); return; }
      setZones(new Set([...zones, ...newGardens]));
      setPlants(new Set([...plants, ...newPlants]));
      setNotice({ text: `Se agregó al conjunto: ${contentsLabel(newGardens.length, newPlants.length)}.` });
      return;
    }
    const dropGardens = gardens.filter((id) => zones.has(id));
    const dropPlants = trees.filter((id) => plants.has(id));
    if (dropGardens.length + dropPlants.length === 0) { setNotice({ text: 'No había nada elegido ahí.' }); return; }
    const before = { zones, plants };
    setZones(new Set([...zones].filter((id) => !dropGardens.includes(id))));
    setPlants(new Set([...plants].filter((id) => !dropPlants.includes(id))));
    setNotice({ text: `Se quitó del conjunto: ${contentsLabel(dropGardens.length, dropPlants.length)}.`,
      undo: () => { setZones(before.zones); setPlants(before.plants); setNotice(null); } });
  };
  const hint = useSweepHint(mapRegion);
  const { selecting, layer: ctrlLayer } = useCtrlRectangle({ mapRegion, enabled: Boolean(scene) && !unsupported, onRectangle });

  /** Mantener pulsado y arrastrar: agrega lo que toca, del tipo con que empezó y si el modo lo deja elegir. */
  const sweepAdd = (target: Target, data: SceneData) => {
    if (target.layer === 'vegetation') {
      const hit = specimenByCode.get(data.vegetation[target.index]?.props.code);
      if (hit) { setLit(hit.group.key); setPlants((prev) => (prev.has(hit.id) ? prev : new Set([...prev, hit.id]))); }
      return;
    }
    if (target.layer !== 'greenAreas' && target.layer !== 'xerophytic' && target.layer !== 'reserve') return;
    const hit = sectionByCode.get(data[target.layer][target.index]?.props.code);
    if (hit) { setLit(hit.group.key); setZones((prev) => (prev.has(hit.id) ? prev : new Set([...prev, hit.id]))); }
  };

  const markGardens = (g: SectorGroup) => { keepOpen(g.key); setLit(g.key); setZones((prev) => new Set([...prev, ...g.sections.map((s) => s.id)])); };
  const markPlants = (g: SectorGroup) => { keepOpen(g.key); setLit(g.key); setPlants((prev) => new Set([...prev, ...g.specimens.map((e) => e.id)])); };
  const clearGroup = (g: SectorGroup) => {
    keepOpen(g.key); setLit(g.key);
    const ids = new Set(g.sections.map((s) => s.id));
    const plantIds = new Set(g.specimens.map((e) => e.id));
    setZones((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    setPlants((prev) => new Set([...prev].filter((id) => !plantIds.has(id))));
  };
  /** Lo que el modo deja elegir en un sector. */
  const own = useCallback((g: SectorGroup) => ({ gardens: pickGardens ? g.sections : [], trees: pickPlants ? g.specimens : [] }),
    [pickGardens, pickPlants]);
  /** Los sectores que se recorren con las flechas: los que tienen algo que el modo deja elegir. */
  const navigable = useMemo(() => groups.filter((g) => own(g).gardens.length + own(g).trees.length > 0), [groups, own]);
  const focusedGroup = navigable.find((g) => g.key === focused) ?? null;
  const focusedIndex = focusedGroup ? navigable.indexOf(focusedGroup) : -1;

  /** Lleva a un sector: lo encuadra entero, lo pinta tenue y abre su tarjeta; sin sector, todo el campus. */
  const goTo = (g: SectorGroup | null) => {
    setNotice((n) => (n && !n.undo ? null : n));
    if (!g) { setFocused(null); viewer.current?.fit(); return; }
    setFocused(g.key);
    light(g.key);
    const { gardens, trees } = own(g);
    viewer.current?.focusSections(gardens.map((s) => s.code), trees.map((e) => e.code));
  };
  /** Las flechas dan la vuelta; desde todo el campus, la derecha va al primero y la izquierda al último. */
  const step = (delta: 1 | -1) => {
    if (!navigable.length) return;
    const next = focusedIndex < 0 ? (delta > 0 ? 0 : navigable.length - 1) : (focusedIndex + delta + navigable.length) % navigable.length;
    goTo(navigable[next]);
  };

  // El sector que se recorre se pinta tenue; lo elegido se ve encima con su color.
  const tint = useMemo(() => (focusedGroup ? {
    sections: own(focusedGroup).gardens.map((s) => s.code), specimens: own(focusedGroup).trees.map((e) => e.code),
  } : { sections: [] as string[], specimens: [] as string[] }), [focusedGroup, own]);
  useEffect(() => { viewer.current?.setTintedArea?.(tint.sections, tint.specimens); }, [tint]);

  const toggleOpen = (key: string, open: boolean) => setOpenedByHand((prev) => new Map(prev).set(key, !open));
  const searching = term.trim() !== '';
  const gardenMatches = (s: ZoneOption) => matches(`${s.name} ${s.code}`, term);
  const treeMatches = (e: GreenAreaSetElement) => matches(`${e.displayName} ${e.code} ${e.sectionName ?? ''}`, term);
  /** Al buscar, va la tarjeta con algo que coincida; si no, la que tiene algo elegido y la del sector que se recorre. */
  const cardVisible = (g: SectorGroup, shownItems: number, chosen: number) =>
    (searching ? shownItems > 0 : chosen > 0 || focusedGroup?.key === g.key || openedByHand.has(g.key));
  const visibleCards = navigable.filter((g) => {
    const { gardens, trees } = own(g);
    const chosen = gardens.filter((s) => zones.has(s.id)).length + trees.filter((e) => plants.has(e.id)).length;
    return cardVisible(g, gardens.filter(gardenMatches).length + trees.filter(treeMatches).length, chosen);
  }).length;

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
        <div ref={mapRegion} role="region" aria-label="Mapa del campus" className="relative min-h-[250px] flex-[2] overflow-hidden bg-neutral-100 md:min-h-0">
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView data={scene} start={REAL_COLORS}
              onReady={(v) => {
                viewer.current = v; v.setMarkedSections(markedCodes); v.setMarkedSpecimens(markedPlantCodes);
                v.setTintedArea?.(tint.sections, tint.specimens); v.setLayerVisible('supervision', false);
              }}
              onUnsupported={() => setUnsupported(true)}
              onSelect={(target) => { if (!selecting) onMapPick(target, scene); }}
              selectionSweep={{ enabled: (kind) => (kind === 'section' ? pickGardens : pickPlants),
                onSelect: (target) => sweepAdd(target, scene), onState: hint.onState }}
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
                  <button className={TOOL} type="button" onClick={() => viewer.current?.top()}>Vista superior</button>
                  <button className={TOOL} type="button" onClick={() => viewer.current?.fit()}>Ver campus</button>
                  {/* Cómo elegir varios, siempre a la vista: no hay botón que active un modo. */}
                  <span className={`${MAP_CHIP} px-2.5 py-1.5 font-medium text-neutral-600`}>
                    <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-sans">Ctrl</kbd>: clic izquierdo elige varios, clic derecho los quita
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
          </div>
          {ctrlLayer}
          {hint.badge}
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
            <div role="group" aria-label="Recorrer sectores" className="flex items-center gap-1.5">
              <button type="button" className={STEP} onClick={() => step(-1)} disabled={!navigable.length} aria-label="Sector anterior">‹</button>
              <label htmlFor="set-picker-sector" className="sr-only">Sector</label>
              <select id="set-picker-sector" value={focusedGroup?.key ?? ''} onChange={(e) => goTo(navigable.find((g) => g.key === e.target.value) ?? null)}
                className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm font-medium text-neutral-900">
                <option value="">Todo el campus</option>
                {navigable.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
              </select>
              <button type="button" className={STEP} onClick={() => step(1)} disabled={!navigable.length} aria-label="Sector siguiente">›</button>
            </div>
            <p className="-mt-1 text-xs text-neutral-500">{focusedGroup
              ? `Sector ${focusedIndex + 1} de ${navigable.length}: en el mapa se pinta tenue y abajo se ve todo lo que tiene.`
              : 'Recorre los sectores con las flechas o elige uno; abajo solo va lo elegido.'}</p>
            {notice && <div role="status" className="flex items-start justify-between gap-2 rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">
              <span>{notice.text}</span>
              {notice.undo && <button type="button" onClick={notice.undo} className="shrink-0 font-semibold underline underline-offset-2">Deshacer</button>}
            </div>}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-label="Sectores">
            {visibleCards === 0 && <li className="rounded-xl border border-dashed border-neutral-300 bg-neutral-0 p-4 text-center text-sm text-neutral-600">
              {searching ? 'Nada coincide con la búsqueda.' : 'Todavía no elegiste nada. Elige en el mapa, busca arriba o recorre los sectores con las flechas.'}</li>}
            {navigable.map((g) => {
              const { gardens: ownGardens, trees: ownTrees } = own(g);
              const isFocused = focusedGroup?.key === g.key;
              // Sin buscar, cada tarjeta muestra lo elegido; el sector que se recorre, todo lo suyo; al buscar, todo lo que coincide.
              const showAll = searching || isFocused;
              const gardens = ownGardens.filter((s) => (showAll || zones.has(s.id) || touched.has(`z${s.id}`)) && gardenMatches(s));
              const trees = ownTrees.filter((e) => (showAll || plants.has(e.id) || touched.has(`e${e.id}`)) && treeMatches(e));
              const chosenGardens = ownGardens.filter((s) => zones.has(s.id)).length;
              const chosenTrees = ownTrees.filter((e) => plants.has(e.id)).length;
              const chosen = chosenGardens + chosenTrees;
              if (!cardVisible(g, gardens.length + trees.length, chosen)) return null;
              const open = searching || isFocused || (openedByHand.get(g.key) ?? chosen > 0);
              const isLit = lit === g.key;
              return (
                <li key={g.key} aria-label={g.name} aria-current={isFocused ? 'true' : undefined}
                  ref={(el) => { if (el) cards.current.set(g.key, el); else cards.current.delete(g.key); }}
                  className={`overflow-hidden rounded-xl border bg-neutral-0 transition-shadow ${isLit ? 'border-brand-600 ring-2 ring-brand-600'
                    : isFocused ? 'border-brand-600' : 'border-neutral-200'}`}>
                  <div className={`flex items-center justify-between gap-2 px-3 py-2 ${chosen > 0 ? 'bg-brand-50' : 'bg-neutral-0'}`}>
                    <button type="button" aria-expanded={open} onClick={() => toggleOpen(g.key, open)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-neutral-900">
                      <span aria-hidden="true" className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                      <span className="truncate" title={g.name}>{g.name}</span>
                    </button>
                    {isFocused && <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800">En el mapa</span>}
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
