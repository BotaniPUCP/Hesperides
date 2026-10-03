'use client';

import { useEffect, useState } from 'react';
import type { PlaceDetail } from '@shared/types';
import { LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { focusPlace } from './focusPlace';
import { useSceneData } from './useSceneData';

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
  const { data, isLoading } = useSceneData();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    if (!viewer || !data) return;
    const p = place;
    viewer.setViewCones(p.perspectives.map((v) => ({ id: v.id, lat: v.lat, lon: v.lon, headingDeg: v.headingDeg })));
    focusPlace(viewer, data, p);
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
