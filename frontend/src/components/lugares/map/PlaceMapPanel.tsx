'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlaceDetail } from '@shared/types';
import { Button, LoadingSkeleton, useToast } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';
import { useCanEditPlaces } from '../edit/useCanEditPlaces';
import { focusPlace, highlightBuilding } from '../focusPlace';
import { useSceneData } from '../useSceneData';
import { mapViewToPose, poseToMapView } from './mapView';

const nada = () => undefined;

export interface PlaceMapPanelProps {
  place: PlaceDetail | null;
  focusedPerspective: number | null;
  onChanged: () => void;
}

/** Vuela solo si cambió el lugar o su vista: recargar la ficha tras subir una foto no debe mover la cámara. */
const flightKey = (p: PlaceDetail) => `${p.code}|${JSON.stringify(p.mapView)}`;

/**
 * El mapa de las fichas de lugar. Se crea una vez y, al pasar a otro lugar, vuela
 * a su vista guardada (o al encuadre automático). Quien edita guarda aquí la
 * vista: encuadra a mano y pulsa «Guardar esta vista».
 */
export function PlaceMapPanel({ place, focusedPerspective, onChanged }: PlaceMapPanelProps) {
  const { data, isLoading } = useSceneData();
  const canEdit = useCanEditPlaces();
  const { showToast } = useToast();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const flown = useRef<string | null>(null);

  useEffect(() => {
    if (!viewer || !data || !place) return;
    viewer.setViewCones(place.perspectives.map((v) => ({ id: v.id, lat: v.lat, lon: v.lon, headingDeg: v.headingDeg })));
    if (flown.current === flightKey(place)) return;
    flown.current = flightKey(place);
    if (!place.mapView) return focusPlace(viewer, data, place);
    highlightBuilding(viewer, data, place, false);
    viewer.flyToPose(mapViewToPose(data.plane, place.mapView));
  }, [viewer, data, place]);

  useEffect(() => {
    viewer?.focusViewCone(focusedPerspective);
  }, [viewer, focusedPerspective]);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      showToast({ variant: 'success', title: done });
      onChanged();
    } catch (e) {
      showToast({ variant: 'error', title: 'No se pudo guardar la vista', description: mensajeDeApiError(e) });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <LoadingSkeleton variant="map" />;
  if (!data || unsupported) {
    return <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">El mapa no está disponible en este navegador.</p>;
  }
  return (
    <div className="relative h-72 overflow-hidden rounded-xl border border-neutral-200 md:h-96 lg:h-[calc(100dvh-3rem)]">
      <Map3DView data={data} onReady={setViewer} onUnsupported={() => setUnsupported(true)} onSelect={nada} onHover={nada}
        onCompass={nada} onGroundPick={nada} />
      {canEdit && place && viewer && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <Button size="sm" loading={busy} onClick={() => void run(() => placesApi.saveMapView(place.code, poseToMapView(data.plane, viewer.pose())), 'Vista guardada')}>
            Guardar esta vista
          </Button>
          {place.mapView && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => placesApi.clearMapView(place.code), 'Se usa el encuadre automático')}>
              Restablecer vista
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
