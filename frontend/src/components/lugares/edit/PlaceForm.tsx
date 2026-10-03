'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlaceDetail, PlaceInput, PlaceKindCode } from '@shared/types';
import { Button } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';
import { PlaceFormFields, type PlaceFormValues } from './PlaceFormFields';
import { OutlinePicker } from './OutlinePicker';
import { pointOutline, type PickedOutline } from './mapPick';

/** El contorno guardado, para no obligar a elegirlo de nuevo al editar. */
function currentOutline(place: PlaceDetail): PickedOutline | null {
  const o = place.outline;
  if (o.buildingId !== null) return { outline: { buildingId: o.buildingId }, label: 'Edificio actual' };
  if (o.zoneCode) return { outline: { zoneCode: o.zoneCode }, label: `Área verde ${o.zoneCode}` };
  if (o.featureCode) return { outline: { featureCode: o.featureCode }, label: `Estacionamiento ${o.featureCode}` };
  if (o.source === 'DRAWN' && o.centerLat !== null && o.centerLon !== null) return pointOutline({ lat: o.centerLat, lon: o.centerLon });
  return null;
}

function initialValues(place?: PlaceDetail, defaultName = ''): PlaceFormValues {
  return {
    name: place?.name ?? defaultName,
    kind: (place?.kind.code as PlaceKindCode) ?? 'OUTDOOR',
    category: place?.category.code ?? null,
    parentCode: place?.parent?.code ?? null,
    aliases: place?.aliases.join(', ') ?? '',
  };
}

const splitAliases = (text: string) => text.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);

/** Alta (sin `place`) o edición de un lugar. Al guardar abre su ficha. */
export function PlaceForm({ place, defaultName }: { place?: PlaceDetail; defaultName?: string }) {
  const router = useRouter();
  const [values, setValues] = useState(() => initialValues(place, defaultName));
  const [picked, setPicked] = useState<PickedOutline | null>(() => (place ? currentOutline(place) : null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outdoor = values.kind === 'OUTDOOR';
  const ready = values.name.trim() !== '' && values.category !== null && (outdoor ? picked !== null : values.parentCode !== null);

  async function save() {
    if (!values.category) return;
    const input: PlaceInput = {
      name: values.name.trim(),
      kindCode: values.kind,
      categoryCode: values.category,
      parentCode: values.parentCode,
      outline: outdoor && picked ? picked.outline : {},
      aliases: splitAliases(values.aliases),
    };
    setSaving(true);
    setError(null);
    try {
      const code = place ? (await placesApi.update(place.code, input), place.code) : (await placesApi.create(input)).code;
      router.push(`/lugares/${code}`);
    } catch (e) {
      setError(mensajeDeApiError(e));
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-neutral-0 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <PlaceFormFields values={values} onChange={setValues} excludeCode={place?.code} />
      {outdoor && <OutlinePicker picked={picked} onPick={setPicked} />}
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push(place ? `/lugares/${place.code}` : '/lugares')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!ready} loading={saving}>
          Guardar lugar
        </Button>
      </div>
    </form>
  );
}
