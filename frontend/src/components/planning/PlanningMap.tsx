'use client';

import { useMemo } from 'react';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { SetMap } from './SetMap';

const NONE: string[] = [];

/** El campus con los jardines y ejemplares del conjunto elegido iluminados; sin conjunto, sin realce (SPEC-203 §7). */
export function PlanningMap({ setId }: { setId: number | null }) {
  const set = useRequest(setId ? `planning-map-set:${setId}` : null, () => greenAreaSetsApi.get(setId!));
  const zoneCodes = useMemo(() => (setId && set.data ? set.data.zones.map((z) => z.code) : NONE), [setId, set.data]);
  const specimenCodes = useMemo(() => (setId && set.data ? set.data.elements.map((e) => e.code) : NONE), [setId, set.data]);
  return <SetMap zoneCodes={zoneCodes} specimenCodes={specimenCodes} className="lg:h-full" />;
}
