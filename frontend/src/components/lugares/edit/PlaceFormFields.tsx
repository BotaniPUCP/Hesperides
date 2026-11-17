'use client';

import { useState } from 'react';
import type { PlaceKindCode } from '@shared/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { usePlaces } from '@/hooks/usePlaces';
import { cn } from '@/lib/cn';
import { categoryOptions } from '../categoryOptions';

export interface PlaceFormValues {
  name: string;
  kind: PlaceKindCode;
  category: string | null;
  parentCode: string | null;
  aliases: string[];
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
  const [aliasInput, setAliasInput] = useState('');
  const [manageAliasesOpen, setManageAliasesOpen] = useState(false);
  const categories = useCatalog('REFERENCE_CATEGORY');
  const { places } = usePlaces(NO_FILTERS);
  const set = (patch: Partial<PlaceFormValues>) => onChange({ ...values, ...patch });
  const parents = places
    .filter((p) => p.code !== excludeCode)
    .map((p, i) => ({ id: i + 1, code: p.code, label: p.parent ? `${p.name} · ${p.parent.name}` : p.name }));
  const aliasKey = (alias: string) => alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const aliasInputIsDuplicate = values.aliases.some((alias) => aliasKey(alias) === aliasKey(aliasInput.trim()));
  const canAddAlias = aliasInput.trim().length > 0
    && aliasInput.trim().length <= 200
    && !/\s/.test(aliasInput.trim())
    && !aliasInputIsDuplicate;
  const addAlias = () => {
    if (!canAddAlias) return;
    set({ aliases: [...values.aliases, aliasInput.trim()] });
    setAliasInput('');
  };
  const removeAlias = (index: number) => {
    set({ aliases: values.aliases.filter((_, aliasIndex) => aliasIndex !== index) });
  };
  const replaceAlias = (index: number, value: string) => {
    if (/\s/.test(value) || value.length > 200) return;
    if (values.aliases.some((alias, aliasIndex) => aliasIndex !== index && aliasKey(alias) === aliasKey(value.trim()))) return;
    set({ aliases: values.aliases.map((alias, aliasIndex) => aliasIndex === index ? value : alias) });
  };

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
      <div className="flex flex-col gap-3 md:col-span-2" onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
      }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="lugar-alias"
              label="Alias"
              value={aliasInput}
              onChange={(value) => {
                if (!/\s/.test(value)) setAliasInput(value);
              }}
              placeholder="Escribe un alias de una palabra"
              helperText="Agrega cada alias por separado; la búsqueda también los encuentra."
              maxLength={200}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={addAlias} disabled={!canAddAlias}>Agregar alias</Button>
            {excludeCode && (
              <Button type="button" variant="secondary" onClick={() => setManageAliasesOpen(true)}>
                Gestionar alias
              </Button>
            )}
          </div>
        </div>

        {values.aliases.length > 0 && (
          <ul aria-label="Alias agregados" className="flex flex-wrap gap-2">
            {values.aliases.map((alias, index) => (
              <li key={`${alias}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-800">
                <span>{alias}</span>
                <button
                  type="button"
                  aria-label={`Quitar alias ${alias}`}
                  onClick={() => removeAlias(index)}
                  className="rounded-full px-1.5 font-semibold hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {excludeCode && (
        <Modal
          isOpen={manageAliasesOpen}
          onClose={() => setManageAliasesOpen(false)}
          title="Gestionar alias"
          footer={<Button type="button" onClick={() => setManageAliasesOpen(false)}>Listo</Button>}
        >
          {values.aliases.length === 0 ? (
            <p className="text-sm text-neutral-600">Este lugar no tiene alias registrados.</p>
          ) : (
            <ul className="space-y-3">
              {values.aliases.map((alias, index) => (
                <li key={`${alias}-${index}`} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      id={`lugar-alias-gestionar-${index}`}
                      label={`Alias ${index + 1}`}
                      value={alias}
                      onChange={(value) => replaceAlias(index, value)}
                      maxLength={200}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    aria-label={`Quitar alias ${alias}`}
                    onClick={() => removeAlias(index)}
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
