'use client';

import { useCallback, useEffect, useMemo, type RefObject } from 'react';
import type { MapCatalog } from '@shared/types';
import { useRequest } from '@/hooks/useRequest';
import { placesApi } from '@/lib/places-api';
import { PERSPECTIVES_TOGGLE, type ToggleId } from '../layerList';
import type { MapCardContent } from '../MapInfoCard';
import type { SceneData } from '../sceneData';
import type { CatalogTarget } from '../searchIndex';
import type { Target } from '../target';
import type { Viewer } from '../viewer/createViewer';
import { catalogEntries, catalogLink, conesOf, placeCard, placeOfBuilding } from './catalogOnMap';

/** El catálogo resumido. Sin él, el mapa funciona igual: solo no muestra lugares ni perspectivas. */
export function useMapCatalog(): MapCatalog | null {
  return useRequest('map-catalog', () => placesApi.map()).data;
}

/** Del edificio pulsado a su lugar en el catálogo, para la ficha. */
export function useCatalogLinkFor(data: SceneData | null, catalog: MapCatalog | null) {
  return useCallback(
    (target: Target) => {
      if (!data || target.layer !== 'campusBuildings') return null;
      const place = placeOfBuilding(catalog, data.campusBuildings[target.index].props.id);
      return place ? catalogLink(place) : null;
    },
    [data, catalog],
  );
}

interface ScreenActions {
  viewer: RefObject<Viewer | null>;
  visible: Record<string, boolean>;
  select: (target: Target) => void;
  toggleLayer: (id: ToggleId, on: boolean) => void;
  showCard: (content: MapCardContent) => void;
}

/**
 * Lo que el catálogo agrega al mapa: los conos de la capa «Perspectivas», la
 * ficha de una perspectiva al pulsar su cono, y a dónde lleva un resultado del
 * buscador que es un lugar o una perspectiva.
 */
export function useCatalogOnMap(data: SceneData | null, catalog: MapCatalog | null, s: ScreenActions) {
  const cones = useMemo(() => conesOf(catalog), [catalog]);
  const conesOn = Boolean(s.visible[PERSPECTIVES_TOGGLE]);
  const { viewer, showCard } = s;

  useEffect(() => {
    viewer.current?.setViewCones(conesOn ? cones : []);
  }, [viewer, conesOn, cones]);

  const onConePick = useCallback(
    (id: number) => {
      const perspective = catalog?.perspectives.find((v) => v.id === id);
      if (perspective) showCard({ kind: 'perspective', perspective });
    },
    [catalog, showCard],
  );

  function pick(target: CatalogTarget) {
    if (!catalog || !data) return;
    if (target.layer === 'catalogPerspective') {
      const perspective = catalog.perspectives[target.index];
      if (!conesOn) s.toggleLayer(PERSPECTIVES_TOGGLE, true);
      viewer.current?.setViewCones(cones);
      viewer.current?.focusViewCone(perspective.id);
      return showCard({ kind: 'perspective', perspective });
    }
    const place = catalog.places[target.index];
    const building = data.campusBuildings.findIndex((b) => b.props.id === place.buildingId);
    if (building >= 0) return s.select({ layer: 'campusBuildings', index: building });
    if (place.lat !== null && place.lon !== null) viewer.current?.focusLatLon(place.lat, place.lon);
    showCard({ kind: 'element', card: placeCard(place) });
  }

  const entries = useMemo(() => (catalog ? catalogEntries(catalog) : []), [catalog]);
  return { entries, onConePick, pick };
}
