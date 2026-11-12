'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Species, SpeciesForm } from '@shared/types';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { ApiError } from '@/lib/api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { CamposMedidasEspecie } from './CamposMedidasEspecie';
import { ConfirmSaveModal } from './ConfirmSaveModal';
import { aFormulario, erroresMedidas, medidasDe, type ErroresMedidas } from './medidasEspecie';
import { normalizarNombreCientifico, validarNombreCientifico } from './validacionesEspecie';

export interface EdicionEspecieFormProps {
  species: Species;
  onSaved: (saved: Species) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function avisoDeCambio(aCritica: boolean, ejemplares: number): string {
  const uno = ejemplares === 1;
  return aCritica
    ? `${ejemplares} ${uno ? 'ejemplar dejará' : 'ejemplares dejarán'} de mostrar el promedio y ${uno ? 'pasará' : 'pasarán'} a Sin medir.`
    : `${ejemplares} ${uno ? 'ejemplar sin medir pasará' : 'ejemplares sin medir pasarán'} a mostrar el promedio y ${uno ? 'dejará' : 'dejarán'} de pedir verificación en campo.`;
}

const opciones = (items: { code: string; label: string }[]) =>
  items.map((i, idx) => ({ id: idx + 1, code: i.code, label: i.label }));

/** Corrige una especie (SPEC-105 §5.1 y §5.2). La foto conserva su propio flujo en la ficha. */
export function EdicionEspecieForm({ species, onSaved, onCancel, onDirtyChange }: EdicionEspecieFormProps) {
  const [nombre, setNombre] = useState(species.scientificName);
  const [comun, setComun] = useState(species.commonName ?? '');
  const [familia, setFamilia] = useState(species.family ?? '');
  const [tipo, setTipo] = useState<string | null>(species.vegetationTypeCode);
  const [origen, setOrigen] = useState<string | null>(species.originCode ?? null);
  const [otros, setOtros] = useState(species.otherNames.join(', '));
  const [descripcion, setDescripcion] = useState(species.description ?? '');
  const [cuidados, setCuidados] = useState(species.careNotes ?? '');
  const [medidas, setMedidas] = useState(() => medidasDe(species));

  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errores, setErrores] = useState<ErroresMedidas>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { items: tipos, isLoading: cargandoTipos } = useCatalog('SPECIES_TYPE');
  const { items: origenes, isLoading: cargandoOrigenes } = useCatalog('SPECIES_ORIGIN');

  const formulario: SpeciesForm = useMemo(() => ({
    scientificName: normalizarNombreCientifico(nombre),
    commonName: comun.trim() || undefined,
    family: familia.trim() || undefined,
    vegetationTypeCode: tipo ?? '',
    originCode: origen ?? undefined,
    otherNames: otros.split(',').map((n) => n.trim()).filter(Boolean),
    description: descripcion.trim() || undefined,
    careNotes: cuidados.trim() || undefined,
    ...aFormulario(medidas),
  }), [nombre, comun, familia, tipo, origen, otros, descripcion, cuidados, medidas]);

  const [inicial] = useState(() => JSON.stringify(formulario));
  const sucio = JSON.stringify(formulario) !== inicial;
  useEffect(() => onDirtyChange?.(sucio), [sucio, onDirtyChange]);

  const cambiaCriticidad = medidas.critical !== species.critical;

  function validar(): boolean {
    const nombreInvalido = validarNombreCientifico(nombre);
    const erroresDeMedidas = erroresMedidas(medidas);
    setErrorNombre(nombreInvalido || null);
    setErrores(erroresDeMedidas);
    return !nombreInvalido && Object.keys(erroresDeMedidas).length === 0;
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      onSaved(await inventarioVerdeApi.updateSpecies(species.slug, formulario));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Ya existe una especie con este nombre científico en el catálogo.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado al guardar la especie.');
      }
    } finally {
      setConfirmando(false);
      setGuardando(false);
    }
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    if (cambiaCriticidad) setConfirmando(true);
    else void guardar();
  }

  return (
    <>
      <form className="space-y-6" noValidate onSubmit={alEnviar}>
        <Card title="Identificación botánica">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input id="scientific-name" label="Nombre científico" value={nombre} onChange={setNombre} required
                errorMessage={errorNombre ?? undefined} helperText="La dirección de la ficha no cambia al corregirlo" />
            </div>
            <Input id="common-name" label="Nombre común" value={comun} onChange={setComun} />
            <Input id="family" label="Familia botánica" value={familia} onChange={setFamilia} />
            <Select id="vegetation-type" label="Tipo de vegetación" options={opciones(tipos)} value={tipo}
              onChange={(o) => setTipo(o?.code ?? null)} loading={cargandoTipos} required />
            <Select id="origin" label="Origen biogeográfico" options={opciones(origenes)} value={origen}
              onChange={(o) => setOrigen(o?.code ?? null)} loading={cargandoOrigenes} clearable />
            <div className="sm:col-span-2">
              <Input id="other-names" label="Otros nombres comunes (separados por coma)" value={otros} onChange={setOtros} />
            </div>
          </div>
        </Card>

        <CamposMedidasEspecie
          valores={medidas}
          onCambiar={setMedidas}
          errores={errores}
          aviso={tipo !== species.vegetationTypeCode ? 'Cambiaste el tipo; revisa si esta especie debe ser crítica.' : null}
        />

        <Card title="Descripción y cuidados botánicos">
          <div className="space-y-4">
            <Textarea id="description" label="Descripción taxonómica" value={descripcion} onChange={setDescripcion} />
            <Textarea id="care-notes" label="Requerimientos y mantenimiento" value={cuidados} onChange={setCuidados} />
          </div>
        </Card>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-alert-danger-bg border border-alert-danger-border text-sm text-alert-danger-fg">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={guardando}>Guardar cambios</Button>
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={guardando}>Cancelar</Button>}
        </div>
      </form>

      <ConfirmSaveModal
        isOpen={confirmando}
        title={medidas.critical ? '¿Marcar la especie como crítica?' : '¿Marcar la especie como no crítica?'}
        entityLabel={species.scientificName}
        subtitle="Decisión de seguridad del catálogo"
        confirmLabel="Confirmar cambio"
        cancelLabel="Revisar"
        isWorking={guardando}
        onConfirm={() => void guardar()}
        onCancel={() => setConfirmando(false)}
      >
        <p className="text-sm text-neutral-700">
          {avisoDeCambio(medidas.critical, species.unmeasuredSpecimenCount)}
        </p>
      </ConfirmSaveModal>
    </>
  );
}
