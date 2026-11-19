'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { planningApi } from '@/lib/planning-api';

interface Props {
  typeId: number | null;
  typeLabel: string;
  date: string;
  zoneIds: number[];
  onRemove: (zoneId: number) => void;
}

/**
 * «Atendido hace poco» (SPEC-203 §5.6): un jardín de la intervención cuya fecha
 * cae antes de última vez + mínimo de su frecuencia. Avisa, nunca bloquea (D-11).
 */
export function RecentAttentionNotice({ typeId, typeLabel, date, zoneIds, onRemove }: Props) {
  const [kept, setKept] = useState<Set<number>>(new Set());
  const ready = typeId !== null && date !== '' && zoneIds.length > 0;
  const recent = useRequest(ready ? `recent:${typeId}:${date}:${zoneIds.join(',')}` : null,
    () => planningApi.recentAttention(typeId!, date, zoneIds));
  const shown = (recent.data ?? []).filter((r) => !kept.has(r.zoneId));
  if (shown.length === 0) return null;

  return (
    <div role="status" className="space-y-2 rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
      {shown.map((r) => (
        <div key={r.zoneId} className="flex flex-wrap items-center justify-between gap-2">
          <span>{r.displayName} ya tuvo {typeLabel} hace {r.daysSinceLast} {r.daysSinceLast === 1 ? 'día' : 'días'} (el mínimo es {r.minDays})</span>
          <span className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onRemove(r.zoneId)}>Quitar de esta intervención</Button>
            <Button size="sm" variant="ghost" onClick={() => setKept((prev) => new Set(prev).add(r.zoneId))}>Mantenerlo</Button>
          </span>
        </div>
      ))}
    </div>
  );
}
