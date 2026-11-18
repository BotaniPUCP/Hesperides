'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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
/** Los mapas de Conjuntos nacen en colores reales, como el mapa principal (SPEC-112 D-13). */
const REAL_COLORS = { realColors: true };
/** Lo que se mueve el puntero antes de considerar que se movió el mapa y no que se hizo clic. */
const DRAG_PX = 6;
/** Las flechas que recorren los sectores: grandes, porque son la forma de moverse entre sectores. */
const STEP = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold leading-none text-white shadow hover:bg-forest-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none';
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

/**
 * El sector en foco: su tarjeta se eligió (o se llegó con las flechas), el mapa encuadra lo elegido
 * en él y todo el sector se pinta tenue. {@code onSelection} pasa a falso cuando se mueve el mapa:
 * el sector sigue sombreado, pero la vista ya no está sobre lo elegido.
 */
interface Focus {
  key: string;
  onSelection: boolean;
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
  /** Marcada siempre al abrir: la lista muestra lo elegido y las flechas recorren los sectores que tienen algo. */
  const [onlySelected, setOnlySelected] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  /** La tarjeta iluminada: la del sector donde se eligió o quitó algo por última vez. */
  const [lit, setLit] = useState<string | null>(null);
  /** Lo que la persona abrió o cerró a mano; si no tocó una tarjeta, se abre cuando tiene algo elegido. */
  const [openedByHand, setOpenedByHand] = useState<Map<string, boolean>>(new Map());
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

  /** Lo que el modo deja elegir en un sector, y cuánto de eso está elegido. */
  const own = useCallback((g: SectorGroup) => {
    const gardens = pickGardens ? g.sections : [];
    const trees = pickPlants ? g.specimens : [];
    const chosenGardens = gardens.filter((s) => zones.has(s.id));
    const chosenTrees = trees.filter((e) => plants.has(e.id));
    return { gardens, trees, chosenGardens, chosenTrees, chosen: chosenGardens.length + chosenTrees.length };
  }, [pickGardens, pickPlants, zones, plants]);
  /** Los sectores con algo que el modo deja elegir. */
  const navigable = useMemo(() => groups.filter((g) => own(g).gardens.length + own(g).trees.length > 0), [groups, own]);

  const searching = term.trim() !== '';
  const gardenMatches = (s: ZoneOption) => matches(`${s.name} ${s.code}`, term);
  const treeMatches = (e: GreenAreaSetElement) => matches(`${e.displayName} ${e.code} ${e.sectionName ?? ''}`, term);
  /** Lo que una tarjeta muestra: al buscar, lo que coincide; con «Ver solo lo elegido», lo elegido; si no, todo. */
  const shownIn = (g: SectorGroup) => {
    const o = own(g);
    if (searching) return { gardens: o.gardens.filter(gardenMatches), trees: o.trees.filter(treeMatches) };
    if (onlySelected) return { gardens: o.chosenGardens, trees: o.chosenTrees };
    return { gardens: o.gardens, trees: o.trees };
  };
  const cardVisible = (g: SectorGroup) => {
    if (!searching && !onlySelected) return true;
    const shown = shownIn(g);
    return shown.gardens.length + shown.trees.length > 0;
  };
  const visibleCards = navigable.filter(cardVisible);
  // El foco vale mientras su sector esté en la lista (buscar no lo suelta): si se le quita todo con «Ver solo lo elegido», se suelta.
  const inList = (g: SectorGroup) => !onlySelected || own(g).chosen > 0;
  const focusedGroup = focus ? navigable.find((g) => g.key === focus.key && inList(g)) ?? null : null;
  const activeFocus = focusedGroup ? focus : null;
  /** Las flechas recorren los sectores de la lista: con «Ver solo lo elegido», los que tienen algo elegido. */
  const travel = onlySelected ? navigable.filter((g) => own(g).chosen > 0) : navigable;
  const travelIndex = focusedGroup ? travel.indexOf(focusedGroup) : -1;

  /** Avisa, sin impedirlo, cuando se agrega algo de otro sector que el que está en foco. */
  const warnIfOutside = (group: SectorGroup, adding: boolean) => {
    setNotice(adding && focusedGroup && focusedGroup.key !== group.key
      ? { text: `Agregaste algo de ${group.name}, fuera de ${focusedGroup.name}, que es el sector en foco.` } : null);
  };

  const toggleIn = (set: Set<number>, id: number) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  /** Una tarjeta en la que se trabajó queda abierta, aunque se le quite todo, para no plegarse bajo el cursor. */
  const keepOpen = (key: string) => setOpenedByHand((prev) => (prev.has(key) ? prev : new Map(prev).set(key, true)));
  const showCard = (key: string) => cards.current.get(key)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  /** Ilumina la tarjeta del sector donde se eligió algo, para que se sepa de cuál es, y la trae a la vista. */
  const light = (key: string) => { setLit(key); queueMicrotask(() => showCard(key)); };
  const toggleZone = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !zones.has(id)); keepOpen(group.key); light(group.key); setZones((prev) => toggleIn(prev, id));
  };
  const togglePlant = (id: number, group: SectorGroup) => {
    warnIfOutside(group, !plants.has(id)); keepOpen(group.key); light(group.key); setPlants((prev) => toggleIn(prev, id));
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
    if (mostTouched) light(mostTouched);
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

  /** Pone el foco en un sector: el mapa encuadra lo elegido en él (o el sector entero si no tiene nada) y lo sombrea. */
  const focusOn = (g: SectorGroup) => {
    const o = own(g);
    setFocus({ key: g.key, onSelection: true });
    setOpenedByHand((prev) => new Map(prev).set(g.key, true));
    setNotice((n) => (n && !n.undo ? null : n));
    queueMicrotask(() => showCard(g.key));
    const inFrame = o.chosen > 0 ? o : { chosenGardens: o.gardens, chosenTrees: o.trees };
    viewer.current?.focusSections(inFrame.chosenGardens.map((s) => s.code), inFrame.chosenTrees.map((e) => e.code));
  };
  /** Clic en la tarjeta: pone el foco; si ya lo tenía sobre lo elegido, lo quita (deja de sombrear y nada más). */
  const onCardClick = (g: SectorGroup) => {
    if (activeFocus?.key === g.key && activeFocus.onSelection) { setFocus(null); return; }
    focusOn(g);
  };
  /** Las flechas dan la vuelta; sin foco, la derecha va al primero y la izquierda al último. */
  const step = (delta: 1 | -1) => {
    if (!travel.length) return;
    const next = travelIndex < 0 ? (delta > 0 ? 0 : travel.length - 1) : (travelIndex + delta + travel.length) % travel.length;
    focusOn(travel[next]);
  };
  /** «Ver campus» es la única forma de volver a todo el campus: suelta el foco y encuadra el campus. */
  const seeCampus = () => { setFocus(null); viewer.current?.fit(); };

  // Mover o acercar el mapa a mano saca la vista de lo elegido: el sector sigue sombreado.
  const loseFocus = () => setFocus((f) => (f && f.onSelection ? { ...f, onSelection: false } : f));
  const onMapPointerDown = (e: ReactPointerEvent) => { pointerStart.current = selecting ? null : { x: e.clientX, y: e.clientY }; };
  const onMapPointerUp = (e: ReactPointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_PX) loseFocus();
  };

  // El sector en foco se pinta tenue; lo elegido se ve encima con su color.
  // Se repinta solo cuando cambia lo sombreado: la firma es texto, y comparar texto es barato y estable entre renders.
  const tintSignature = JSON.stringify(focusedGroup ? [own(focusedGroup).gardens.map((s) => s.code), own(focusedGroup).trees.map((e) => e.code)] : [[], []]);
  useEffect(() => {
    const [sections, specimenCodes] = JSON.parse(tintSignature) as [string[], string[]];
    viewer.current?.setTintedArea?.(sections, specimenCodes);
  }, [tintSignature]);

  const toggleOpen = (key: string, open: boolean) => setOpenedByHand((prev) => new Map(prev).set(key, !open));

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
          onWheelCapture={() => { if (!selecting) loseFocus(); }}>
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView data={scene} start={REAL_COLORS}
              onReady={(v) => {
                viewer.current = v; v.setMarkedSections(markedCodes); v.setMarkedSpecimens(markedPlantCodes);
                const [sections, specimenCodes] = JSON.parse(tintSignature) as [string[], string[]];
                v.setTintedArea?.(sections, specimenCodes); v.setLayerVisible('supervision', false);
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
                  <button className={TOOL} type="button" onClick={seeCampus}>Ver campus</button>
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
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} /> Ver solo lo elegido</label>
            {/* Recorrer los sectores: las flechas ponen el foco en el anterior o el siguiente de la lista. */}
            <div role="group" aria-label="Recorrer sectores" className="flex items-center gap-2">
              <button type="button" className={STEP} onClick={() => step(-1)} disabled={!travel.length} aria-label="Sector anterior">‹</button>
              <p aria-live="polite" className="min-w-0 flex-1 text-center text-sm">
                {focusedGroup
                  ? <><span className="block truncate font-semibold text-neutral-900">{focusedGroup.name}</span>
                    <span className="text-xs text-neutral-500">{travelIndex >= 0 ? `${travelIndex + 1} de ${travel.length} · ` : ''}
                      {activeFocus?.onSelection ? 'en foco' : 'solo sombreado'}</span></>
                  : <span className="text-xs text-neutral-500">{travel.length
                    ? `Recorre ${travel.length === 1 ? 'el sector' : `los ${travel.length} sectores`}${onlySelected ? ' con algo elegido' : ''}, o toca una tarjeta.`
                    : 'Elige algo para recorrer sus sectores.'}</span>}
              </p>
              <button type="button" className={STEP} onClick={() => step(1)} disabled={!travel.length} aria-label="Sector siguiente">›</button>
            </div>
            {notice && <div role="status" className="flex items-start justify-between gap-2 rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">
              <span>{notice.text}</span>
              {notice.undo && <button type="button" onClick={notice.undo} className="shrink-0 font-semibold underline underline-offset-2">Deshacer</button>}
            </div>}
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-label="Sectores">
            {visibleCards.length === 0 && <li className="rounded-xl border border-dashed border-neutral-300 bg-neutral-0 p-4 text-center text-sm text-neutral-600">
              {searching ? 'Nada coincide con la búsqueda.'
                : 'Todavía no elegiste nada. Elige en el mapa o busca arriba; para ver todos los sectores, desmarca «Ver solo lo elegido».'}</li>}
            {visibleCards.map((g) => {
              const { gardens: ownGardens, trees: ownTrees, chosenGardens, chosenTrees, chosen } = own(g);
              const { gardens, trees } = shownIn(g);
              const isFocused = activeFocus?.key === g.key;
              const onSelection = isFocused && activeFocus.onSelection;
              const open = searching || (openedByHand.get(g.key) ?? (chosen > 0 || isFocused));
              // Naranja como el sombreado del mapa: lleno con foco sobre lo elegido, punteado si solo queda el sombreado.
              const frame = onSelection ? 'border-orange-500 ring-2 ring-orange-400'
                : isFocused ? 'border-dashed border-orange-400'
                  : lit === g.key ? 'border-brand-600 ring-2 ring-brand-600' : 'border-neutral-200';
              return (
                <li key={g.key} aria-label={g.name} aria-current={isFocused ? 'true' : undefined}
                  ref={(el) => { if (el) cards.current.set(g.key, el); else cards.current.delete(g.key); }}
                  className={`overflow-hidden rounded-xl border-2 bg-neutral-0 transition-shadow ${frame}`}>
                  <div className={`flex items-center gap-1 px-2 py-2 ${isFocused ? 'bg-orange-50' : chosen > 0 ? 'bg-brand-50' : 'bg-neutral-0'}`}>
                    <button type="button" aria-expanded={open} onClick={() => toggleOpen(g.key, open)}
                      aria-label={`${open ? 'Plegar' : 'Desplegar'} ${g.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
                      <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                    </button>
                    <button type="button" onClick={() => onCardClick(g)} aria-pressed={onSelection}
                      title={onSelection ? 'Quitar el foco y el sombreado' : 'Ver lo elegido de este sector y sombrearlo en el mapa'}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-neutral-900">
                      <span className="truncate">{g.name}</span>
                    </button>
                    {isFocused && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${onSelection
                      ? 'bg-orange-500 text-white' : 'border border-dashed border-orange-400 text-orange-800'}`}>{onSelection ? 'En foco' : 'Sombreado'}</span>}
                    {chosen > 0 && <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{contentsLabel(chosenGardens.length, chosenTrees.length)}</span>}
                  </div>
                  <div className="space-y-1.5 px-3 pb-2 pt-1">
                    {ownGardens.length > 0 && <Meter label="Jardines" chosen={chosenGardens.length} total={ownGardens.length} />}
                    {ownTrees.length > 0 && <Meter label="Ejemplares" chosen={chosenTrees.length} total={ownTrees.length} />}
                  </div>
                  {open && (
                    <div className="space-y-3 border-t border-neutral-200 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ownGardens.length > 0 && <button type="button" className={CARD_ACTION}
                          disabled={chosenGardens.length === ownGardens.length} onClick={() => markGardens(g)}>Marcar jardines</button>}
                        {ownTrees.length > 0 && <button type="button" className={CARD_ACTION}
                          disabled={chosenTrees.length === ownTrees.length} onClick={() => markPlants(g)}>Marcar ejemplares</button>}
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
