'use client';

import { useMemo, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { useMapLayers } from '@/hooks/useMapLayers';
import { Map3DView } from '@/components/map3d/Map3DView';
import { toSceneData } from '@/components/map3d/sceneData';

const nada = () => undefined;

/**
 * El mapa 3D para marcar dónde está la planta (SPEC-103 D-08). Un clic en el
 * suelo da el punto; sin WebGL o sin capas, quedan las coordenadas a mano.
 */
export function MapaSelector({ onElegir }: { onElegir: (lat: number, lon: number) => void }) {
  const { data: response, isLoading } = useMapLayers();
  const [sinMapa, setSinMapa] = useState(false);
  const data = useMemo(() => {
    try {
      return response ? toSceneData(response) : null;
    } catch {
      return null;
    }
  }, [response]);

  if (isLoading) return <LoadingSkeleton variant="card" />;
  if (!data || sinMapa) {
    return (
      <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
        El mapa no está disponible en este navegador. Escribe la latitud y la longitud.
      </p>
    );
  }

  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200 sm:h-96">
      <Map3DView
        data={data}
        onReady={nada}
        onUnsupported={() => setSinMapa(true)}
        onSelect={nada}
        onHover={nada}
        onCompass={nada}
        onGroundPick={onElegir}
      />
      <p className="pointer-events-none absolute left-2 top-2 rounded bg-neutral-0/90 px-2 py-1 text-xs text-neutral-700">
        Haz clic en el suelo donde está la planta
      </p>
    </div>
  );
}
