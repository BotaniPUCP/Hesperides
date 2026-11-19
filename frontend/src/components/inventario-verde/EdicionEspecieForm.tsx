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
import { mensajeDeApiError } from '@/lib/api-errors';

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

  const cambios = useMemo(() => {
    const lista: { etiqueta: string; anterior: string; nuevo: string }[] = [];

    const normNombre = normalizarNombreCientifico(nombre);
    if (normNombre && normNombre !== species.scientificName) {
      lista.push({ etiqueta: 'Nombre científico', anterior: species.scientificName, nuevo: normNombre });
    }
    const normComun = comun.trim();
    if (normComun !== (species.commonName ?? '')) {
      lista.push({ etiqueta: 'Nombre común', anterior: species.commonName || '—', nuevo: normComun || '—' });
    }
    const normFamilia = familia.trim();
    if (normFamilia !== (species.family ?? '')) {
      lista.push({ etiqueta: 'Familia botánica', anterior: species.family || '—', nuevo: normFamilia || '—' });
    }
    if (tipo !== species.vegetationTypeCode) {
      const anteriorLabel = tipos.find((t) => t.code === species.vegetationTypeCode)?.label || species.vegetationTypeName || species.vegetationTypeCode;
      const nuevoLabel = tipos.find((t) => t.code === tipo)?.label || tipo || '—';
      lista.push({ etiqueta: 'Tipo de vegetación', anterior: anteriorLabel, nuevo: nuevoLabel });
    }
    if (origen !== (species.originCode ?? null)) {
      const anteriorLabel = origenes.find((o) => o.code === species.originCode)?.label || '—';
      const nuevoLabel = origenes.find((o) => o.code === origen)?.label || '—';
      lista.push({ etiqueta: 'Origen', anterior: anteriorLabel, nuevo: nuevoLabel });
    }
    const otrosNorm = otros.split(',').map((n) => n.trim()).filter(Boolean).join(', ');
    const otrosAnt = (species.otherNames ?? []).join(', ');
    if (otrosNorm !== otrosAnt) {
      lista.push({ etiqueta: 'Otros nombres', anterior: otrosAnt || '—', nuevo: otrosNorm || '—' });
    }
    if (medidas.critical !== species.critical) {
      lista.push({
        etiqueta: 'Criticidad',
        anterior: species.critical ? 'Especie crítica' : 'No crítica',
        nuevo: medidas.critical ? 'Especie crítica' : 'No crítica',
      });
    }
    const parseNum = (s: string) => (s.trim() === '' ? null : Number(s.trim().replace(',', '.')));
    const cambioMedidas =
      medidas.usaFuste !== species.usesTrunkHeight ||
      medidas.usaDap !== species.usesDbh ||
      parseNum(medidas.alturaM) !== species.referenceHeightM ||
      parseNum(medidas.radioM) !== species.referenceCrownRadiusM ||
      medidas.fuenteAltura !== species.referenceHeightSourceCode ||
      medidas.fuenteRadio !== species.referenceCrownRadiusSourceCode ||
      medidas.adicionales.length !== (species.extraMeasures?.length ?? 0);
    if (cambioMedidas) {
      lista.push({
        etiqueta: 'Medidas de referencia',
        anterior: 'Configuración previa',
        nuevo: 'Métricas actualizadas',
      });
    }
    const normDesc = descripcion.trim();
    const normCuidados = cuidados.trim();
    if (normDesc !== (species.description ?? '').trim() || normCuidados !== (species.careNotes ?? '').trim()) {
      lista.push({
        etiqueta: 'Descripción y cuidados',
        anterior: 'Texto previo',
        nuevo: 'Contenido actualizado',
      });
    }

    return lista;
  }, [nombre, comun, familia, tipo, origenes, otros, medidas, descripcion, cuidados, species, tipos, origen]);

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
        setError(err instanceof ApiError ? mensajeDeApiError(err) : 'Ocurrió un error inesperado al guardar la especie.');
      }
    } finally {
      setConfirmando(false);
      setGuardando(false);
    }
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!sucio) return;
    if (!validar()) return;
    setConfirmando(true);
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
            <Input id="common-name" label="Nombre común" value={comun} onChange={setComun} placeholder="Ej. Jacarandá" />
            <Input id="family" label="Familia botánica" value={familia} onChange={setFamilia} placeholder="Ej. Bignoniaceae" />
            <Select id="vegetation-type" label="Tipo de vegetación" options={opciones(tipos)} value={tipo}
              onChange={(o) => setTipo(o?.code ?? null)} loading={cargandoTipos} required />
            <Select id="origin" label="Origen biogeográfico" options={opciones(origenes)} value={origen}
              onChange={(o) => setOrigen(o?.code ?? null)} loading={cargandoOrigenes} clearable />
            <div className="sm:col-span-2">
              <Input
                id="other-names"
                label="Otros nombres comunes (separados por coma)"
                value={otros}
                onChange={setOtros}
                placeholder="Ej. Tarco, Gualanday"
              />
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
            <Textarea
              id="description"
              label="Descripción taxonómica"
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Características morfológicas, porte, floración o signos distintivos para reconocimiento botánico en campo..."
            />
            <Textarea
              id="care-notes"
              label="Requerimientos y mantenimiento"
              value={cuidados}
              onChange={setCuidados}
              placeholder="Requerimientos de exposición solar, riego recomendado, frecuencia de poda o advertencias fitosanitarias..."
            />
          </div>
        </Card>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-alert-danger-bg border border-alert-danger-border text-sm text-alert-danger-fg">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={guardando} disabled={guardando || !sucio}>Guardar cambios</Button>
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={guardando}>Cancelar</Button>}
        </div>
      </form>

      <ConfirmSaveModal
        isOpen={confirmando}
        title={cambiaCriticidad
          ? (medidas.critical ? '¿Marcar la especie como crítica?' : '¿Marcar la especie como no crítica?')
          : 'Confirmar cambios en la especie'}
        entityLabel={species.commonName ? `${species.commonName} (${species.scientificName})` : species.scientificName}
        subtitle={cambiaCriticidad ? 'Decisión de seguridad del catálogo' : 'Resumen de modificaciones'}
        confirmLabel={cambiaCriticidad ? 'Confirmar cambio' : 'Confirmar y guardar'}
        cancelLabel="Revisar datos"
        isWorking={guardando}
        onConfirm={() => void guardar()}
        onCancel={() => setConfirmando(false)}
      >
        <div className="space-y-3">
          {cambiaCriticidad && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs leading-relaxed">
              <strong>Impacto en ejemplares:</strong> {avisoDeCambio(medidas.critical, species.unmeasuredSpecimenCount)}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              {cambios.length === 1 ? '1 modificación a registrar:' : `${cambios.length} modificaciones a registrar:`}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
              {cambios.map((c, i) => (
                <div key={i} className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs">
                  <span className="font-semibold text-neutral-800">{c.etiqueta}</span>
                  <div className="flex items-center gap-1.5 text-neutral-600 mt-0.5">
                    <span className="line-through text-neutral-400 truncate max-w-[130px]">{c.anterior}</span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-medium text-brand-800 truncate max-w-[130px]">{c.nuevo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-600 pt-0.5">
            ¿Confirmas guardar estas modificaciones en el catálogo botánico?
          </p>
        </div>
      </ConfirmSaveModal>
    </>
  );
}
