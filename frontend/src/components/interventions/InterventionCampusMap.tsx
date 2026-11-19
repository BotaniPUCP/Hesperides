'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import type { Target } from '@/components/map3d/target';
import { useCtrlRectangle, type RectangleAction, type ScreenRect } from '@/components/map3d/useCtrlRectangle';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import type { CampusOptions, InterventionLocation } from '@/lib/interventions-api';
import { campusScene, targetOf, type CampusTarget } from './campusSelection';
import { useSweepHint } from '@/components/map3d/useSweepHint';

interface Props {
  options: CampusOptions; selected: InterventionLocation[]; disabled: boolean; focus: InterventionLocation | null;
  /** Clic: agrega o quita uno. */
  onToggle: (target: CampusTarget) => void;
  /** Barrido y Ctrl + clic izquierdo: agregan varios, nunca quitan. */
  onAdd: (targets: CampusTarget[]) => void;
  /** Ctrl + clic derecho: quita varios. */
  onRemove: (targets: CampusTarget[]) => void;
}

export function InterventionCampusMap({ options, selected, disabled, focus, onToggle, onAdd, onRemove }: Props) {
  const layers = useMapLayers(); const viewer = useRef<Viewer | null>(null);
  const [unsupported, setUnsupported] = useState(false); const [notice, setNotice] = useState('');
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const hint = useSweepHint(mapContainer);
  const scene = useMemo(() => { if (!layers.data) return null; try { return campusScene(layers.data, options); } catch { return null; } }, [layers.data, options]);
  const areas = useMemo(() => options.zones.filter((z) => selected.some((l) => l.zoneId === z.id)).map((z) => z.code), [options, selected]);
  const specimens = useMemo(() => options.specimens.filter((s) => selected.some((l) => l.zoneId === null && l.elementIds.includes(s.id))).map((s) => s.code), [options, selected]);

  /** Lo que hay bajo un objetivo del visor, si es un jardín o un ejemplar del inventario. */
  const campusTargetOf = (target: Target): CampusTarget | null => {
    if (!scene) return null;
    const layer = target.layer;
    if (layer === 'greenAreas' || layer === 'xerophytic') {
      const code = scene[layer][target.index]?.props.code;
      const zone = options.zones.find((z) => z.code === code);
      return zone ? { kind: 'area', id: zone.id } : null;
    }
    if (target.layer === 'vegetation') {
      const specimen = options.specimens.find((s) => s.code === scene.vegetation[target.index]?.props.code);
      return specimen ? { kind: 'specimen', id: specimen.id } : null;
    }
    return null;
  };
  const inRectangle = ({ x1, y1, x2, y2 }: ScreenRect): CampusTarget[] => {
    const v = viewer.current;
    if (!v) return [];
    const zoneCodes = v.sectionCodesInScreenRect(x1, y1, x2, y2, options.zones.map((z) => z.code));
    const specimenCodes = v.specimenCodesInScreenRect(x1, y1, x2, y2, options.specimens.map((s) => s.code));
    return [...options.zones.filter((z) => zoneCodes.includes(z.code)).map((z) => ({ kind: 'area' as const, id: z.id })),
      ...options.specimens.filter((s) => specimenCodes.includes(s.code)).map((s) => ({ kind: 'specimen' as const, id: s.id }))];
  };
  const onRectangle = (rect: ScreenRect, action: RectangleAction) => {
    if (disabled) return;
    const targets = inRectangle(rect);
    if (!targets.length) { setNotice('El rectángulo no encerró jardines ni ejemplares.'); return; }
    setNotice('');
    if (action === 'add') onAdd(targets); else onRemove(targets);
  };
  const ctrl = useCtrlRectangle({ mapRegion: mapContainer, enabled: Boolean(scene) && !unsupported, onRectangle });

  const locate = (l: InterventionLocation | null) => {
    if (!l) return; const t = targetOf(l);
    const item = t.kind === 'area' ? options.zones.find((z) => z.id === t.id) : options.specimens.find((s) => s.id === t.id);
    if (item) viewer.current?.focusLatLon(item.point.latitude, item.point.longitude);
  };
  useEffect(() => { viewer.current?.setMarkedSections(areas); viewer.current?.setMarkedSpecimens(specimens); }, [areas, specimens]);
  useEffect(() => { locate(focus); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (unsupported || layers.errorMessage || (!layers.isLoading && !scene)) return <p role="alert">El mapa no está disponible. Recarga la página o usa un navegador con WebGL.</p>;
  if (!scene) return <p role="status">Cargando mapa del campus…</p>;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => viewer.current?.fit()}>Ver campus</Button><Button variant="secondary" size="sm" onClick={() => viewer.current?.top()}>Vista superior</Button></div>
    <p className="text-sm text-neutral-600">Pulsa áreas verdes o ejemplares para seleccionarlos. Vuelve a pulsarlos para retirarlos. Lo seleccionado se resalta en celeste.</p>
    <p className="text-xs text-neutral-600">Mantén pulsado un jardín o un ejemplar 2 segundos y arrastra: agrega solo de ese tipo. Con Ctrl, clic izquierdo elige varios y clic derecho los quita.</p>
    <div ref={mapContainer} className="relative h-96 overflow-hidden rounded-lg border border-neutral-200" aria-label="Mapa de selección de áreas verdes y ejemplares">
      <Map3DView data={scene} onReady={(v) => { viewer.current = v; v.setEligibleSections?.(options.zones.map((z) => z.code)); v.setMarkedSections(areas); v.setMarkedSpecimens(specimens); v.setLayerVisible('vegetation', true); v.setLayerVisible('reserve', false); v.setLayerVisible('supervision', false); locate(focus); }}
        onUnsupported={() => setUnsupported(true)} onHover={() => undefined} onCompass={() => undefined} onGroundPick={() => undefined}
        selectionSweep={{
          enabled: () => !disabled,
          onSelect: (target) => { const t = disabled ? null : campusTargetOf(target); if (t) onAdd([t]); },
          onState: hint.onState,
        }}
        onSelect={(target) => {
          viewer.current?.select(null, false); viewer.current?.clearPin?.(); if (!target || disabled) return;
          const t = campusTargetOf(target);
          if (t) { onToggle(t); setNotice(''); return; }
          setNotice(target.layer === 'greenAreas' || target.layer === 'xerophytic' ? 'Esta área no está disponible para planificar.'
            : target.layer === 'vegetation' ? '' : 'Selecciona un área verde o un ejemplar. Los edificios son solo referencia.');
        }} />
      {ctrl.layer}
      <div className="absolute bottom-1 left-1"><MapAttribution required /></div>
      {hint.badge}
    </div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </div>;
}
