'use client';

import { useMemo } from 'react';
import { SectionsFocusMap } from '@/components/map3d/SectionsFocusMap';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

/** El campus con los jardines del conjunto elegido iluminados; sin conjunto, sin realce (SPEC-203 §7). */
export function PlanningMap({ setId }: { setId: number | null }) {
  const set = useRequest(setId ? `planning-map-set:${setId}` : null, () => greenAreaSetsApi.get(setId!));
  const codes = useMemo(() => (setId && set.data ? set.data.zones.map((z) => z.code) : []), [setId, set.data]);
  return <SectionsFocusMap codes={codes} />;
}
