'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { useMapLayers } from '@/hooks/useMapLayers';
import { Map3DView } from '@/components/map3d/Map3DView';
import { toSceneData } from '@/components/map3d/sceneData';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

const nada = () => undefined;

export interface MapaSelectorProps {
  onElegir: (lat: number, lon: number) => void;
  lat?: string | number;
  lon?: string | number;
  etiqueta?: string;
}

function parseCoord(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const trimmed = val.trim().replace(',', '.');
  if (trimmed === '' || trimmed === '-' || trimmed === '+' || trimmed === '.') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/**
 * El mapa 3D para marcar dónde está la planta o elemento (SPEC-103 D-08).
 * Soporta sincronización bidireccional: un clic en el mapa actualiza los inputs,
 * y escribir o pegar coordenadas válidas enfoca la cámara y reposiciona el pin.
 */
export function MapaSelector({
  onElegir,
  lat,
  lon,
  etiqueta = 'Haz clic donde está la planta',
}: MapaSelectorProps) {
  const { data: response, isLoading } = useMapLayers();
  const [sinMapa, setSinMapa] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const lastPointRef = useRef<{ lat: number; lon: number } | null>(null);

  const data = useMemo(() => {
    try {
      return response ? toSceneData(response) : null;
    } catch {
      return null;
    }
  }, [response]);

  // Sincronización del formulario hacia el mapa 3D: reposiciona el pin y enfoca
  useEffect(() => {
    if (!viewer || !data) return;

    const numLat = parseCoord(lat);
    const numLon = parseCoord(lon);
    if (numLat === null || numLon === null) return;
    if (numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) return;

    // Evita bucles o reenfocar si la coordenada viene del mismo clic reciente en el mapa
    if (
      lastPointRef.current &&
      Math.abs(lastPointRef.current.lat - numLat) < 1e-6 &&
      Math.abs(lastPointRef.current.lon - numLon) < 1e-6
    ) {
      return;
    }

    // Comprueba que caiga en una distancia plausible del campus (radio de 2000 m)
    const p = data.plane.toPlane(numLat, numLon);
    if (Math.abs(p.x) > 2000 || Math.abs(p.y) > 2000) return;

    // Si se borran ambos campos, retira el pin del mapa
    if ((lat === '' || lat === undefined) && (lon === '' || lon === undefined)) {
      viewer.clearPin?.();
      lastPointRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      lastPointRef.current = { lat: numLat, lon: numLon };
      viewer.setPinLatLon?.(numLat, numLon);
      viewer.focusLatLon(numLat, numLon);
    }, 200);

    return () => clearTimeout(timer);
  }, [lat, lon, viewer, data]);

  if (isLoading) return <LoadingSkeleton variant="card" />;
  if (!data || sinMapa) {
    return (
      <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
        El mapa no está disponible en este navegador. Escribe la latitud y la longitud.
      </p>
    );
  }

  const handlePointPick = (pickLat: number, pickLon: number) => {
    lastPointRef.current = { lat: pickLat, lon: pickLon };
    onElegir(pickLat, pickLon);
  };

  const handleReady = (v: Viewer) => {
    setViewer(v);
    const numLat = parseCoord(lat);
    const numLon = parseCoord(lon);
    if (
      numLat !== null &&
      numLon !== null &&
      numLat >= -90 && numLat <= 90 &&
      numLon >= -180 && numLon <= 180
    ) {
      const p = data.plane.toPlane(numLat, numLon);
      if (Math.abs(p.x) <= 2000 && Math.abs(p.y) <= 2000) {
        lastPointRef.current = { lat: numLat, lon: numLon };
        v.setPinLatLon?.(numLat, numLon);
        v.focusLatLon(numLat, numLon);
      }
    }
  };

  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200 sm:h-96">
      <Map3DView
        data={data}
        onReady={handleReady}
        onUnsupported={() => setSinMapa(true)}
        onSelect={nada}
        onHover={nada}
        onCompass={nada}
        onGroundPick={nada}
        onPointPick={handlePointPick}
      />
      <p className="pointer-events-none absolute left-2 top-2 rounded bg-neutral-0/90 px-2 py-1 text-xs text-neutral-700">
        {etiqueta}
      </p>
    </div>
  );
}
