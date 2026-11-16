'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { mensajeDeApiError } from '@/lib/api-errors';
import { mapApi } from '@/lib/map-api';
import { infoFor, type InfoCard } from './infoCard';
import { PERSPECTIVES_TOGGLE, type ToggleId } from './layerList';
import type { MapCardContent } from './MapInfoCard';
import { recallMapScreen, rememberMapScreen } from './mapScreenMemory';
import type { ViewOptions } from './MapToolbar';
import type { ModeId } from './modes';
import { APPLY_OPTION, applyToViewer, keptCard } from './restoreMapScreen';
import type { SceneData } from './sceneData';
import type { LayerId, Target } from './target';
import type { Viewer } from './viewer/createViewer';

/** Un enlace extra para la ficha de un elemento: hoy, del edificio a su lugar en el catálogo. */
export type CardLinkFor = (target: Target) => InfoCard['link'] | null;

/**
 * El estado de la pantalla del mapa y su reflejo en el visor. El visor no es
 * React: cada cambio se guarda aquí (para pintar los controles) y se ordena al
 * visor en el mismo gesto. Solo un visor recién creado recibe el estado de golpe.
 */
export function useMapScreenState(data: SceneData | null, person: string, linkFor?: CardLinkFor) {
  const viewer = useRef<Viewer | null>(null);
  const describeSeq = useRef(0);
  // Los bloques marcados de un lugar: un visor nuevo (al llegar el modelo del plano) debe volver a marcarlos.
  const markedIds = useRef<readonly number[]>([]);
  // La noche del mapa sigue al tema de la app (claro, oscuro o el del sistema), como el fondo de los módulos.
  const themeNight = useTheme().resolved === 'dark';
  const [saved] = useState(() => {
    const memory = recallMapScreen(person);
    // Lo elegido a mano se conserva al volver, salvo que el tema haya cambiado mientras tanto.
    const night = memory.nightTheme === themeNight ? memory.options.night : themeNight;
    return { ...memory, options: { ...memory.options, night } };
  });
  const [mode, setModeState] = useState<ModeId>(saved.mode);
  const [hidden, setHidden] = useState<Set<string>>(saved.hidden);
  const [visible, setVisible] = useState<Record<string, boolean>>(saved.visible);
  const [options, setOptions] = useState<ViewOptions>(saved.options);
  const [panelOpen, setPanelOpen] = useState(saved.panelOpen);
  const [selected, setSelected] = useState<Target | null>(saved.selected);
  const [card, setCard] = useState<MapCardContent | null>(saved.card);
  const [compass, setCompass] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  // Cuenta los visores listos: lo que depende del visor debe repetirse cuando llega uno nuevo.
  const [viewerEpoch, setViewerEpoch] = useState(0);
  // Si el tema cambia con el mapa abierto, el mapa lo sigue; el botón «Noche» lo cambia a mano hasta entonces.
  const [nightTheme, setNightTheme] = useState(themeNight);
  if (nightTheme !== themeNight) {
    setNightTheme(themeNight);
    setOptions((o) => ({ ...o, night: themeNight }));
  }
  useEffect(() => {
    viewer.current?.setNight(nightTheme);
  }, [nightTheme]);

  useEffect(() => {
    rememberMapScreen({ mode, hidden, visible, options, panelOpen, selected, card, nightTheme });
  }, [mode, hidden, visible, options, panelOpen, selected, card, nightTheme]);

  /** Los bloques de un lugar del catálogo; cualquier otra ficha los quita. */
  const markBuildings = useCallback((ids: readonly number[]) => {
    if (markedIds.current.length === 0 && ids.length === 0) return;
    markedIds.current = ids;
    viewer.current?.setMarkedBuildings(ids);
  }, []);
  const clearMarks = useCallback(() => markBuildings([]), [markBuildings]);

  const showElement = useCallback(
    (target: Target | null) => {
      describeSeq.current++;
      clearMarks();
      setSelected(target);
      if (!target || !data) return setCard(null);
      const element = infoFor(data, target);
      const link = element.link ?? linkFor?.(target) ?? undefined;
      setCard({ kind: 'element', card: { ...element, link } });
    },
    [data, linkFor, clearMarks],
  );

  const onReady = (v: Viewer) => {
    viewer.current = v;
    applyToViewer(v, { mode, hidden, visible, options });
    if (selected && data) {
      const kept = keptCard(data, selected, card, linkFor);
      setCard(kept);
      if (kept) v.select(selected, false);
      else setSelected(null);
    }
    if (card?.kind === 'location') v.setPinLatLon?.(card.lat, card.lon);
    if (markedIds.current.length > 0) v.setMarkedBuildings(markedIds.current);
    setViewerEpoch((epoch) => epoch + 1);
  };

  const onGroundPick = useCallback((lat: number, lon: number) => {
    const seq = ++describeSeq.current;
    clearMarks();
    setSelected(null);
    setCard({ kind: 'location', lat, lon, text: null, error: null });
    mapApi
      .describe(lat, lon)
      .then((d) => seq === describeSeq.current && setCard({ kind: 'location', lat, lon, text: d.text, error: null }))
      .catch((e: unknown) => seq === describeSeq.current && setCard({ kind: 'location', lat, lon, text: null, error: mensajeDeApiError(e) }));
  }, [clearMarks]);

  const select = (target: Target) => {
    viewer.current?.select(target, true);
    showElement(target);
  };

  const setMode = (m: ModeId) => {
    const none = new Set<string>();
    setModeState(m);
    setHidden(none);
    viewer.current?.setPaint(m, none);
  };

  const toggleCategory = (key: string) => {
    const next = new Set(hidden);
    if (!next.delete(key)) next.add(key);
    setHidden(next);
    viewer.current?.setPaint(mode, next);
  };

  /** Los conos de «Perspectivas» los pone quien tiene el catálogo, al ver este estado. */
  const toggleLayer = (id: ToggleId, on: boolean) => {
    setVisible((v) => ({ ...v, [id]: on }));
    if (id !== PERSPECTIVES_TOGGLE) viewer.current?.setLayerVisible(id as LayerId, on);
  };

  const showCard = (content: MapCardContent) => {
    describeSeq.current++;
    clearMarks();
    setSelected(null);
    setCard(content);
  };

  const setOption = (key: keyof ViewOptions, on: boolean) => {
    setOptions((o) => ({ ...o, [key]: on }));
    if (viewer.current) APPLY_OPTION[key](viewer.current, on);
  };

  const closeCard = () => {
    describeSeq.current++;
    clearMarks();
    viewer.current?.select(null, false);
    setSelected(null);
    setCard(null);
  };

  return {
    viewer, viewerEpoch, mode, hidden, visible, options, compass, card, unsupported, panelOpen,
    onReady, onSelect: showElement, onGroundPick, onCompass: setCompass, onUnsupported: () => setUnsupported(true),
    select, setMode, toggleCategory, toggleLayer, setOption, closeCard, showCard, setPanelOpen, markBuildings,
  };
}
