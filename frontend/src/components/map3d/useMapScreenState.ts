'use client';

import { useCallback, useRef, useState } from 'react';
import { mensajeDeApiError } from '@/lib/api-errors';
import { mapApi } from '@/lib/map-api';
import { infoFor } from './infoCard';
import { initialVisibility, LAYER_TOGGLES } from './layerList';
import type { MapCardContent } from './MapInfoCard';
import type { ViewOptions } from './MapToolbar';
import type { ModeId } from './modes';
import type { SceneData } from './sceneData';
import type { LayerId, Target } from './target';
import type { Viewer } from './viewer/createViewer';

const INITIAL_OPTIONS: ViewOptions = { night: false, shadows: true, labels: true, grayBuildings: false };

const APPLY_OPTION: Record<keyof ViewOptions, (v: Viewer, on: boolean) => void> = {
  night: (v, on) => v.setNight(on),
  shadows: (v, on) => v.setShadows(on),
  labels: (v, on) => v.setLabels(on),
  grayBuildings: (v, on) => v.setGrayBuildings(on),
};

/**
 * El estado de la pantalla del mapa y su reflejo en el visor. El visor no es
 * React: cada cambio se guarda aquí (para pintar los controles) y se ordena al
 * visor en el mismo gesto, sin efectos que sincronicen después.
 */
export function useMapScreenState(data: SceneData | null) {
  const viewer = useRef<Viewer | null>(null);
  const describeSeq = useRef(0);
  const [mode, setModeState] = useState<ModeId>('base');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<Record<string, boolean>>(initialVisibility);
  const [options, setOptions] = useState<ViewOptions>(INITIAL_OPTIONS);
  const [compass, setCompass] = useState(0);
  const [card, setCard] = useState<MapCardContent | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const showElement = useCallback(
    (target: Target | null) => {
      describeSeq.current++;
      setCard(target && data ? { kind: 'element', card: infoFor(data, target) } : null);
    },
    [data],
  );

  const onReady = useCallback((v: Viewer) => {
    viewer.current = v;
    LAYER_TOGGLES.filter((t) => !t.initiallyVisible).forEach((t) => v.setLayerVisible(t.id, false));
  }, []);

  const onGroundPick = useCallback((lat: number, lon: number) => {
    const seq = ++describeSeq.current;
    setCard({ kind: 'location', lat, lon, text: null, error: null });
    mapApi
      .describe(lat, lon)
      .then((d) => seq === describeSeq.current && setCard({ kind: 'location', lat, lon, text: d.text, error: null }))
      .catch((e: unknown) => seq === describeSeq.current && setCard({ kind: 'location', lat, lon, text: null, error: mensajeDeApiError(e) }));
  }, []);

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

  const toggleLayer = (id: LayerId, on: boolean) => {
    setVisible((v) => ({ ...v, [id]: on }));
    viewer.current?.setLayerVisible(id, on);
  };

  const setOption = (key: keyof ViewOptions, on: boolean) => {
    setOptions((o) => ({ ...o, [key]: on }));
    if (viewer.current) APPLY_OPTION[key](viewer.current, on);
  };

  const closeCard = () => {
    describeSeq.current++;
    viewer.current?.select(null, false);
    setCard(null);
  };

  return {
    viewer, mode, hidden, visible, options, compass, card, unsupported,
    onReady, onSelect: showElement, onGroundPick, onCompass: setCompass, onUnsupported: () => setUnsupported(true),
    select, setMode, toggleCategory, toggleLayer, setOption, closeCard,
  };
}
