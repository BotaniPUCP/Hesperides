'use client';

import { useState } from 'react';
import type { Species, SpeciesForm } from '@shared/types';
import { Button, Input, Modal, Select, type SelectOption } from '@/components/ui';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { useCatalog } from '@/hooks/useCatalog';
import { LIMITES } from '@/lib/upload-limits';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';

export interface RegistroEspecieModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScientificName?: string;
  onCreated?: (species: Species) => void;
}

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

/**
 * El formulario solo existe mientras el modal está abierto, con una key por nombre
 * inicial: cada apertura nace con su estado, sin un efecto que lo resetee a golpe
 * de setState (react-hooks/set-state-in-effect).
 */
export function RegistroEspecieModal(props: RegistroEspecieModalProps) {
  if (!props.isOpen) return null;
  return <RegistroEspecieDialog key={props.initialScientificName ?? ''} {...props} />;
}

function RegistroEspecieDialog({
  isOpen,
  onClose,
  initialScientificName = '',
  onCreated,
}: RegistroEspecieModalProps) {
  const [scientificName, setScientificName] = useState(initialScientificName);
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

  const { items: catalogTypes, isLoading: loadingTypes } = useCatalog('SPECIES_TYPE');
  const { items: originTypes, isLoading: loadingOrigins } = useCatalog('SPECIES_ORIGIN');

  const typeOptions: SelectOption[] =
    catalogTypes.length > 0
      ? catalogTypes.map((i, idx) => ({ id: idx + 1, code: i.code, label: i.label }))
      : TIPOS_VEGETACION_DEFAULT;

  const originOptions: SelectOption[] = originTypes.map((i, idx) => ({
    id: idx + 1,
    code: i.code,
    label: i.label,
  }));

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

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    const otherNames = otherNamesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const form: SpeciesForm = {
      scientificName: scientificName.trim(),
      commonName: commonName.trim() || undefined,
      family: family.trim() || undefined,
      vegetationTypeCode: vegetationTypeCode!,
      originCode: originCode || undefined,
      otherNames: otherNames.length > 0 ? otherNames : undefined,
      description: description.trim() || undefined,
      careNotes: careNotes.trim() || undefined,
    };

    try {
      const created = await inventarioVerdeApi.registerSpecies(form, photo);
      resetForm();
      onCreated?.(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || `La especie «${scientificName}» ya está registrada en el catálogo`);
      } else if (err instanceof ApiError && err.status === 500) {
        setError('Error del servidor al registrar la especie. Inténtalo más tarde.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al registrar la especie. Inténtalo nuevamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) {
          resetForm();
          onClose();
        }
      }}
      title="Registrar nueva especie botánica"
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            loading={saving}
          >
            Guardar especie
          </Button>
        </div>
      }
    >
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName === 'INPUT') {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      >
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-action-danger/10 border border-action-danger/30 text-action-danger text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="scientificName"
            label="Nombre científico"
            value={scientificName}
            onChange={setScientificName}
            placeholder="ej. Jacaranda mimosifolia"
            required
            errorMessage={fieldErrors.scientificName}
            helperText="Formato binomial en latín (Género + epíteto)"
          />

          <Input
            id="commonName"
            label="Nombre común"
            value={commonName}
            onChange={setCommonName}
            placeholder="ej. Jacarandá"
            helperText="Nombre popular principal en campus"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="vegetationType"
            label="Tipo de vegetación"
            value={vegetationTypeCode}
            onChange={(opt) => setVegetationTypeCode(opt?.code ?? null)}
            options={typeOptions}
            loading={loadingTypes}
            required
            errorMessage={fieldErrors.vegetationTypeCode}
          />

          <Input
            id="family"
            label="Familia botánica"
            value={family}
            onChange={setFamily}
            placeholder="ej. Bignoniaceae"
            helperText="Familia taxonómica (opcional)"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="origin"
            label="Procedencia / Origen"
            value={originCode}
            onChange={(opt) => setOriginCode(opt?.code ?? null)}
            options={originOptions}
            loading={loadingOrigins}
            placeholder="Selecciona el origen (opcional)"
            clearable
          />

          <Input
            id="otherNames"
            label="Nombres alternativos"
            value={otherNamesText}
            onChange={setOtherNamesText}
            placeholder="ej. Tarco, Gualanday"
            helperText="Separados por comas (opcional)"
          />
        </div>

        <div className="border-t border-neutral-200/80 pt-3">
          <CampoArchivo
            id="speciesPhoto"
            etiqueta="Foto de referencia de la especie (opcional)"
            acepta="image/jpeg,image/png"
            limite={LIMITES.foto}
            ayuda="Foto genérica que representará a la especie en el catálogo."
            archivo={photo}
            onElegir={setPhoto}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 border-t border-neutral-200/80 pt-3">
          <Input
            id="description"
            label="Descripción botánica (opcional)"
            value={description}
            onChange={setDescription}
            placeholder="Características morfológicas..."
          />
          <Input
            id="careNotes"
            label="Notas de mantenimiento (opcional)"
            value={careNotes}
            onChange={setCareNotes}
            placeholder="Requerimientos de poda, riego, etc."
          />
        </div>
      </div>
    </Modal>
  );
}
