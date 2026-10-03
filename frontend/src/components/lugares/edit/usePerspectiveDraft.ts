'use client';

import { useEffect, useState } from 'react';
import type { PerspectiveInput, PerspectiveSideCode, PlacePerspective } from '@shared/types';
import type { LocalPlane } from '@/components/map3d/projection';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';
import { headingBetween, type LatLon } from './mapPick';

/** Qué espera el mapa: el punto, la dirección, o nada (ya está completa). */
export type DraftStep = 'point' | 'direction' | 'done';

/**
 * Lo que se va marcando de una perspectiva: lado, punto y dirección. Con todo
 * marcado pide al backend el nombre que tendría, sin guardarla.
 */
export function usePerspectiveDraft(placeCode: string, initial: PlacePerspective | null) {
  const [side, setSide] = useState<PerspectiveSideCode | null>((initial?.side.code as PerspectiveSideCode) ?? null);
  const [point, setPoint] = useState<LatLon | null>(initial ? { lat: initial.lat, lon: initial.lon } : null);
  const [heading, setHeading] = useState<number | null>(initial?.headingDeg ?? null);
  const [preview, setPreview] = useState<{ key: string; text: string | null; error: string | null } | null>(null);
  const step: DraftStep = !point ? 'point' : heading === null ? 'direction' : 'done';
  const input: PerspectiveInput | null =
    side && point && heading !== null ? { sideCode: side, lat: point.lat, lon: point.lon, headingDeg: heading } : null;
  const key = input ? JSON.stringify(input) : null;

  useEffect(() => {
    if (!input || !key) return;
    let current = true;
    placesApi
      .previewPerspective(placeCode, input)
      .then((r) => current && setPreview({ key, text: r.displayName, error: null }))
      .catch((e: unknown) => current && setPreview({ key, text: null, error: mensajeDeApiError(e) }));
    return () => {
      current = false;
    };
    // `input` se resume en `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeCode, key]);

  function click(plane: LocalPlane, at: LatLon) {
    if (step === 'direction' && point) {
      setHeading(headingBetween(plane, point, at));
    } else {
      setPoint(at);
      setHeading(null);
    }
  }

  const fresh = preview?.key === key ? preview : null;
  return { side, setSide, point, heading, step, input, click, previewName: fresh?.text ?? null, previewError: fresh?.error ?? null };
}
