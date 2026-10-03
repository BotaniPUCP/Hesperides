'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PerspectiveSideCode, ReferenceQueueGroup } from '@shared/types';
import { Badge, Button, useToast } from '@/components/ui';
import { usePlace } from '@/hooks/usePlaces';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';
import { OtherPlacePicker } from './OtherPlacePicker';

const SIDE_LABEL: Record<PerspectiveSideCode, string> = { FRONT: 'Frente', BACK: 'Espalda', SIDE: 'Al lado' };

export interface MigrationGroupCardProps {
  group: ReferenceQueueGroup;
  onDecided: () => void;
}

/**
 * Un grupo de la cola: las sugerencias para elegir (la primera ya marcada), la
 * perspectiva del lado que nombra el texto, y las tres salidas: enlazar,
 * descartar o crear el lugar que falta.
 */
export function MigrationGroupCard({ group, onDecided }: MigrationGroupCardProps) {
  const { showToast } = useToast();
  const [placeCode, setPlaceCode] = useState<string | null>(group.suggestions[0]?.place.code ?? null);
  const [otherName, setOtherName] = useState<string | null>(null);
  // undefined: la que sugiere el lado del texto; null: solo el lugar.
  const [perspectiveChoice, setPerspectiveChoice] = useState<number | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const { place } = usePlace(placeCode);
  const perspectives = place?.code === placeCode ? place.perspectives : [];
  const bySide = perspectives.find((v) => v.side.code === group.detectedSide)?.id ?? null;
  const perspectiveId = perspectiveChoice === undefined ? bySide : perspectiveChoice;

  function choose(code: string, name: string | null = null) {
    setPlaceCode(code);
    setOtherName(name);
    setPerspectiveChoice(undefined);
  }

  async function decide(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      onDecided();
    } catch (e) {
      showToast({ variant: 'error', title: 'No se pudo guardar la decisión', description: mensajeDeApiError(e) });
      setBusy(false);
    }
  }

  const radioName = `lugar-${group.referenceCodes[0]}`;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-0 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-neutral-900">{group.name}</h3>
        {group.referenceCodes.length > 1 && <span className="text-sm font-semibold text-neutral-500">{`×${group.referenceCodes.length}`}</span>}
        <Badge label={group.category} color="neutral" />
        {group.detectedSide && <Badge label={SIDE_LABEL[group.detectedSide]} color={group.sideUncertain ? 'warning' : 'info'} />}
        {group.sideUncertain && <span className="text-xs text-amber-700">«Frente a» puede ser al otro lado de la calle</span>}
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Lugar</legend>
        {group.suggestions.length === 0 && <p className="text-sm text-neutral-500">Sin sugerencias: búscalo o créalo.</p>}
        {group.suggestions.map((s) => (
          <label key={s.place.code} className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="radio" name={radioName} checked={placeCode === s.place.code && otherName === null} onChange={() => choose(s.place.code)} />
            {s.place.name}
            <span className="text-xs text-neutral-400">{s.score.toFixed(2)}</span>
          </label>
        ))}
        <OtherPlacePicker chosenName={otherName} onChoose={(code, name) => choose(code, name)} />
      </fieldset>

      {placeCode && (
        <label className="flex max-w-md flex-col gap-1 text-sm font-medium text-neutral-700">
          Perspectiva
          <select
            value={perspectiveId === null ? '' : String(perspectiveId)}
            onChange={(e) => setPerspectiveChoice(e.target.value === '' ? null : Number(e.target.value))}
            className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm"
          >
            <option value="">Solo el lugar</option>
            {perspectives.map((v) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!placeCode} loading={busy}
          onClick={() => placeCode && void decide(() => placesApi.linkReferences(group.referenceCodes, placeCode, perspectiveId))}>
          Enlazar
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide(() => placesApi.discardReferences(group.referenceCodes))}>
          No es un lugar
        </Button>
        <Link href={`/lugares/nuevo?nombre=${encodeURIComponent(group.name)}`} className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
          Crear lugar
        </Link>
      </div>
    </article>
  );
}
