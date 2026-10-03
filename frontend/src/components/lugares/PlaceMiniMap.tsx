'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlaceDetail } from '@shared/types';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';

const nada = () => undefined;

export interface PlaceMiniMapProps {
  place: PlaceDetail;
  focusedPerspective: number | null;
}

/**
 * El lugar en la maqueta 3D con un cono por perspectiva. Al abrir, enfoca el
 * edificio (y lo resalta) o el centro del contorno; elegir una perspectiva lleva
 * la cámara a su cono.
 */
export function PlaceMiniMap({ place, focusedPerspective }: PlaceMiniMapProps) {
  const { data: response, isLoading } = useMapLayers();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const data = useMemo(() => {
    try {
      return response ? toSceneData(response) : null;
    } catch {
      return null;
    }
  }, [response]);
  useEffect(() => {
    if (!viewer || !data) return;
    const p = place;
    viewer.setViewCones(p.perspectives.map((v) => ({ id: v.id, lat: v.lat, lon: v.lon, headingDeg: v.headingDeg })));
    const building = data.campusBuildings.findIndex((b) => b.props.id === p.outline.buildingId);
    if (building >= 0) viewer.select({ layer: 'campusBuildings', index: building }, true);
    else if (p.outline.centerLat !== null && p.outline.centerLon !== null) viewer.focusLatLon(p.outline.centerLat, p.outline.centerLon);
  }, [viewer, data, place]);

  useEffect(() => {
    viewer?.focusViewCone(focusedPerspective);
  }, [viewer, focusedPerspective]);

  if (isLoading) return <LoadingSkeleton variant="map" />;
  if (!data || unsupported) {
    return <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">El mapa no está disponible en este navegador.</p>;
  }
  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200 md:h-96">
      <Map3DView
        data={data}
        onReady={setViewer}
        onUnsupported={() => setUnsupported(true)}
        onSelect={nada}
        onHover={nada}
        onCompass={nada}
        onGroundPick={nada}
      />
    </div>
  );
}
