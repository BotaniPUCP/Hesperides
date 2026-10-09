'use client';

import type { PlaceKindCode } from '@shared/types';
import { Input, Select } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { usePlaces } from '@/hooks/usePlaces';
import { cn } from '@/lib/cn';
import { categoryOptions } from '../categoryOptions';

export interface PlaceFormValues {
  name: string;
  kind: PlaceKindCode;
  category: string | null;
  parentCode: string | null;
  /** Separados por coma o salto de línea. */
  aliases: string;
}

export interface PlaceFormFieldsProps {
  values: PlaceFormValues;
  onChange: (values: PlaceFormValues) => void;
  /** El lugar que se edita: no puede ser su propio padre. */
  excludeCode?: string;
}

const KINDS: { value: PlaceKindCode; label: string; hint: string }[] = [
  { value: 'OUTDOOR', label: 'Exterior', hint: 'Edificio, jardín, estacionamiento o complejo: se ubica en el mapa y tiene perspectivas.' },
  { value: 'INDOOR', label: 'Interior', hint: 'Piso, terraza o patio: se ubica por el lugar donde está y tiene fotos por vista.' },
];

const NO_FILTERS = {};

export function PlaceFormFields({ values, onChange, excludeCode }: PlaceFormFieldsProps) {
  const categories = useCatalog('REFERENCE_CATEGORY');
  const { places } = usePlaces(NO_FILTERS);
  const set = (patch: Partial<PlaceFormValues>) => onChange({ ...values, ...patch });
  const parents = places
    .filter((p) => p.code !== excludeCode)
    .map((p, i) => ({ id: i + 1, code: p.code, label: p.parent ? `${p.name} · ${p.parent.name}` : p.name }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input id="lugar-nombre" label="Nombre" value={values.name} onChange={(name) => set({ name })} maxLength={200} required />
      <Select
        id="lugar-categoria"
        label="Categoría"
        value={values.category}
        onChange={(o) => set({ category: o?.code ?? null })}
        options={categoryOptions(categories.items)}
        loading={categories.isLoading}
        required
      />
      <div className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium text-neutral-700">Tipo</span>
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={values.kind === k.value}
              onClick={() => set({ kind: k.value })}
              className={cn('rounded-md border px-3 py-1.5 text-sm', values.kind === k.value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-neutral-200 text-neutral-700')}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">{KINDS.find((k) => k.value === values.kind)?.hint}</p>
      </div>
      <Select
        id="lugar-padre"
        label="Dentro de"
        value={values.parentCode}
        onChange={(o) => set({ parentCode: o?.code ?? null })}
        options={parents}
        placeholder={values.kind === 'INDOOR' ? 'Elige el lugar donde está' : 'Ninguno (lugar principal)'}
        helperText="Hasta tres niveles: zona › complejo › lugar."
        clearable
        required={values.kind === 'INDOOR'}
      />
      <Input
        id="lugar-alias"
        label="Alias"
        value={values.aliases}
        onChange={(aliases) => set({ aliases })}
        placeholder="Otros nombres, separados por coma: lmed, Mac Gregor…"
        helperText="La búsqueda también los encuentra."
      />
    </div>
  );
}
