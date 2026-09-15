'use client';

import { useState } from 'react';
import type {
  CatalogItem,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from '@shared/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';

export interface CatalogItemFormModalProps {
  isOpen: boolean;
  /** null crea, un ítem edita. Mismo formulario: los campos coinciden. */
  item: CatalogItem | null;
  /** Clases disponibles como padre. Vacío en catálogos planos. */
  parentOptions: SelectOption[];
  onClose: () => void;
  onCreate: (body: CreateCatalogItemRequest) => Promise<void>;
  onUpdate: (code: string, body: UpdateCatalogItemRequest) => Promise<void>;
}

interface Valores {
  code: string;
  label: string;
  sortOrder: string;
  parentCode: string;
  description: string;
}

const CODE_VALIDO = /^[A-Z][A-Z0-9_]*$/;

function valoresDe(item: CatalogItem | null): Valores {
  return {
    code: item?.code ?? '',
    label: item?.label ?? '',
    sortOrder: item ? String(item.sortOrder) : '',
    parentCode: item?.parentCode ?? '',
    description: typeof item?.metadata?.description === 'string' ? item.metadata.description : '',
  };
}

/**
 * El `code` solo se pide al crear. Al editar se muestra deshabilitado, no
 * oculto: quien edita necesita saber cuál es —lo ve en reportes y en la API—
 * pero no puede cambiarlo, porque otras tablas lo referencian y el backend
 * decide comparándolo (SPEC-003 §4).
 */
export function CatalogItemFormModal({
  isOpen,
  item,
  parentOptions,
  onClose,
  onCreate,
  onUpdate,
}: CatalogItemFormModalProps) {
  const esAlta = item === null;
  const [values, setValues] = useState<Valores>(() => valoresDe(item));
  const [errors, setErrors] = useState<Partial<Record<keyof Valores, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  const campo = (clave: keyof Valores) => (valor: string) => {
    setValues((previos) => ({ ...previos, [clave]: valor }));
    setErrors((previos) => ({ ...previos, [clave]: undefined }));
  };

  function validar(): boolean {
    const encontrados: Partial<Record<keyof Valores, string>> = {};

    if (esAlta) {
      if (!values.code.trim()) {
        encontrados.code = 'El código es obligatorio';
      } else if (!CODE_VALIDO.test(values.code.trim())) {
        encontrados.code = 'Mayúsculas, dígitos y guion bajo, empezando por letra';
      }
    }
    if (!values.label.trim()) encontrados.label = 'La etiqueta es obligatoria';
    if (values.sortOrder && Number.isNaN(Number(values.sortOrder))) {
      encontrados.sortOrder = 'Debe ser un número';
    }

    setErrors(encontrados);
    return Object.keys(encontrados).length === 0;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!validar()) return;

    setGuardando(true);
    setFormError(undefined);

    // La descripción vive en metadata y no en columna propia: es texto de ayuda
    // para el operario, no un campo que el sistema consulte.
    const metadata = values.description.trim()
      ? { ...(item?.metadata ?? {}), description: values.description.trim() }
      : item?.metadata;

    try {
      if (esAlta) {
        await onCreate({
          code: values.code.trim(),
          label: values.label.trim(),
          sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
          parentCode: values.parentCode || undefined,
          metadata,
        });
      } else {
        await onUpdate(item.code, {
          label: values.label.trim(),
          sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
          metadata,
        });
      }
      onClose();
    } catch (error: unknown) {
      setFormError(mensajeDeApiError(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esAlta ? 'Nuevo ítem' : `Editar ${item.label}`}
    >
      <form className="flex flex-col gap-4" onSubmit={enviar} noValidate>
        <Input
          id="catalog-item-code"
          label="Código"
          value={values.code}
          onChange={campo('code')}
          errorMessage={errors.code}
          disabled={!esAlta}
          helperText={
            esAlta
              ? 'Identificador estable. No podrá cambiarse después.'
              : 'El código no se puede cambiar: otras tablas lo referencian.'
          }
          required={esAlta}
        />

        <Input
          id="catalog-item-label"
          label="Etiqueta"
          value={values.label}
          onChange={campo('label')}
          errorMessage={errors.label}
          helperText="El texto que ven los usuarios. Este sí puede cambiarse."
          required
        />

        {parentOptions.length > 0 && (
          <Select
            id="catalog-item-parent"
            label="Clase"
            value={values.parentCode === '' ? null : values.parentCode}
            options={parentOptions}
            onChange={(option) => campo('parentCode')(option?.code ?? '')}
            placeholder="Sin clase"
            helperText={
              esAlta
                ? 'Clase a la que pertenece este tipo.'
                : 'La clase no se puede cambiar después de crear el ítem.'
            }
            disabled={!esAlta}
            clearable
          />
        )}

        <Input
          id="catalog-item-sort-order"
          label="Orden"
          value={values.sortOrder}
          onChange={campo('sortOrder')}
          errorMessage={errors.sortOrder}
          helperText="Posición en los desplegables. Menor aparece antes."
        />

        <Input
          id="catalog-item-description"
          label="Descripción"
          value={values.description}
          onChange={campo('description')}
          helperText="Texto de ayuda que se muestra junto a la opción."
        />

        {formError && (
          <p className="text-sm text-red-700" role="alert">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardando}>
            {esAlta ? 'Crear ítem' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
