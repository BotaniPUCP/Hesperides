'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Species, SpeciesForm } from '@shared/types';
import { Button, Card, Input, Select, type SelectOption } from '@/components/ui';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { useCatalog } from '@/hooks/useCatalog';
import { LIMITES } from '@/lib/upload-limits';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';

const TIPOS_VEGETACION_DEFAULT: SelectOption[] = [
  { id: 1, code: 'TREE', label: 'Árbol' },
  { id: 2, code: 'SHRUB', label: 'Arbusto' },
  { id: 3, code: 'PALM', label: 'Palmera' },
  { id: 4, code: 'GROUNDCOVER', label: 'Cubresuelo' },
  { id: 5, code: 'CLIMBER', label: 'Trepadora' },
  { id: 6, code: 'HEDGE', label: 'Seto (cerco vivo)' },
  { id: 7, code: 'HERB', label: 'Planta herbácea' },
  { id: 8, code: 'SUCCULENT', label: 'Planta suculenta' },
  { id: 9, code: 'POTTED_HERB', label: 'Macetones (herbáceas)' },
];

export interface RegistroEspecieFormProps {
  onSuccess?: (created: Species) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Formulario dedicado a pantalla completa para dar de alta una nueva especie
 * botánica en el catálogo de flora del campus PUCP.
 */
export function RegistroEspecieForm({ onSuccess, onDirtyChange }: RegistroEspecieFormProps) {
  const [scientificName, setScientificName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [family, setFamily] = useState('');
  const [vegetationTypeCode, setVegetationTypeCode] = useState<string | null>('TREE');
  const [originCode, setOriginCode] = useState<string | null>(null);
  const [otherNamesText, setOtherNamesText] = useState('');
  const [description, setDescription] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState<Species | null>(null);

  const { items: catalogTypes, isLoading: loadingTypes } = useCatalog('SPECIES_TYPE');
  const { items: originTypes, isLoading: loadingOrigins } = useCatalog('SPECIES_ORIGIN');

  const typeOptions: SelectOption[] =
    catalogTypes.length > 0
      ? catalogTypes.map((i, idx) => ({ id: idx + 1, code: i.code, label: i.label }))
      : TIPOS_VEGETACION_DEFAULT;

  const originOptions: SelectOption[] = [
    { id: 0, code: '', label: 'Sin especificar' },
    ...originTypes.map((i, idx) => ({
      id: idx + 1,
      code: i.code,
      label: i.label,
    })),
  ];

  const isDirty = Boolean(
    scientificName ||
    commonName ||
    family ||
    vegetationTypeCode !== 'TREE' ||
    originCode ||
    otherNamesText ||
    description ||
    careNotes ||
    photo
  );

  function resetForm() {
    setScientificName('');
    setCommonName('');
    setFamily('');
    setVegetationTypeCode('TREE');
    setOriginCode(null);
    setOtherNamesText('');
    setDescription('');
    setCareNotes('');
    setPhoto(null);
    setError(null);
    setFieldErrors({});
    setRegistered(null);
    onDirtyChange?.(false);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const scName = scientificName.trim();
    if (!scName) {
      errs.scientificName = 'El nombre científico es obligatorio';
    } else if (scName.length < 2) {
      errs.scientificName = 'Debe tener al menos 2 caracteres';
    }

    if (!vegetationTypeCode) {
      errs.vegetationTypeCode = 'Selecciona el tipo de vegetación';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    const otherNames = otherNamesText
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const payload: SpeciesForm = {
      scientificName: scientificName.trim(),
      commonName: commonName.trim() || undefined,
      family: family.trim() || undefined,
      vegetationTypeCode: vegetationTypeCode!,
      originCode: originCode?.trim() || undefined,
      otherNames: otherNames.length > 0 ? otherNames : undefined,
      description: description.trim() || undefined,
      careNotes: careNotes.trim() || undefined,
    };

    try {
      const created = await inventarioVerdeApi.registerSpecies(payload, photo);
      setRegistered(created);
      onSuccess?.(created);
      onDirtyChange?.(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Ya existe una especie con este nombre científico en el catálogo.');
        } else {
          setError(err.message || 'Error al guardar la especie.');
        }
      } else {
        setError('Ocurrió un error inesperado al registrar la especie.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (registered) {
    return (
      <Card title="Especie registrada exitosamente">
        <div className="space-y-4">
          <p className="text-neutral-700">
            Se ha dado de alta a la especie{' '}
            <strong className="text-neutral-900 font-semibold">
              {registered.commonName || registered.scientificName}
            </strong>{' '}
            <em>({registered.scientificName})</em> en el catálogo botánico de la PUCP.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/inventario-verde/especies/${registered.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition-colors shadow-2xs"
            >
              <span>Ver ficha de la especie</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Button variant="secondary" onClick={resetForm}>
              Registrar otra especie
            </Button>
            <Link
              href="/inventario-verde"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 self-center"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      <Card title="Identificación botánica">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="scientific-name"
              label="Nombre científico"
              value={scientificName}
              onChange={(v) => {
                setScientificName(v);
                if (fieldErrors.scientificName) setFieldErrors((e) => ({ ...e, scientificName: '' }));
                onDirtyChange?.(true);
              }}
              placeholder="Ej. Delonix regia, Jacaranda mimosifolia"
              required
              errorMessage={fieldErrors.scientificName}
              helperText="Género y epíteto específico con nomenclatura binomial"
            />
          </div>

          <Input
            id="common-name"
            label="Nombre común principal"
            value={commonName}
            onChange={(v) => {
              setCommonName(v);
              onDirtyChange?.(true);
            }}
            placeholder="Ej. Flamboyán, Jacarandá"
            helperText="Nombre más extendido en el campus"
          />

          <Input
            id="family"
            label="Familia botánica"
            value={family}
            onChange={(v) => {
              setFamily(v);
              onDirtyChange?.(true);
            }}
            placeholder="Ej. Fabaceae, Bignoniaceae"
            helperText="Familia taxonómica (opcional)"
          />

          <Select
            id="vegetation-type"
            label="Tipo de vegetación"
            options={typeOptions}
            value={vegetationTypeCode}
            onChange={(opt) => {
              setVegetationTypeCode(opt?.code || null);
              onDirtyChange?.(true);
            }}
            required
            disabled={loadingTypes}
            errorMessage={fieldErrors.vegetationTypeCode}
          />

          <Select
            id="origin"
            label="Origen biogeográfico"
            options={originOptions}
            value={originCode ?? ''}
            onChange={(opt) => {
              setOriginCode(opt?.code || null);
              onDirtyChange?.(true);
            }}
            disabled={loadingOrigins}
            helperText="Nativo del Perú, introducido o cultivado"
          />
        </div>
      </Card>

      <Card title="Nombres vernáculos o alternativos">
        <Input
          id="other-names"
          label="Otros nombres comunes (separados por coma)"
          value={otherNamesText}
          onChange={(v) => {
            setOtherNamesText(v);
            onDirtyChange?.(true);
          }}
          placeholder="Ej. Árbol del fuego, Chivato, Tabachín"
          helperText="Permite que la comunidad encuentre la especie por sinónimos coloquiales"
        />
      </Card>

      <Card title="Descripción y cuidados botánicos">
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-800 mb-1">
              Descripción taxonómica
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                onDirtyChange?.(true);
              }}
              placeholder="Características de la copa, floración, tronco, follaje..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>

          <div>
            <label htmlFor="care-notes" className="block text-sm font-medium text-neutral-800 mb-1">
              Requerimientos y mantenimiento
            </label>
            <textarea
              id="care-notes"
              rows={3}
              value={careNotes}
              onChange={(e) => {
                setCareNotes(e.target.value);
                onDirtyChange?.(true);
              }}
              placeholder="Necesidad hídrica, exposición solar, susceptibilidad a plagas, poda..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
        </div>
      </Card>

      <Card title="Fotografía botánica referencial">
        <CampoArchivo
          id="species-photo"
          etiqueta="Foto representativa de la especie (opcional)"
          acepta="image/jpeg,image/png"
          limite={LIMITES.foto}
          archivo={photo}
          onElegir={(f) => {
            setPhoto(f);
            onDirtyChange?.(true);
          }}
          ayuda="Se utilizará como miniatura botánica oficial de la especie en el catálogo."
        />
      </Card>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-alert-danger-bg border border-alert-danger-border text-sm text-alert-danger-fg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={saving} leadingIcon={<span aria-hidden="true">🌱</span>}>
          Registrar especie
        </Button>
        <Link
          href="/inventario-verde"
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
