'use client';

import { useState } from 'react';
import type { ExtraMeasure } from '@shared/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import { puedeCambiarCriticidad } from '@/components/catastro/permisos';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { useRequest } from '@/hooks/useRequest';
import { ApiError } from '@/lib/api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { unidadCorta, type MedidaAdicional } from './medidasEspecie';
import { mensajeDeApiError } from '@/lib/api-errors';

export interface CamposMedidasAdicionalesProps {
  valores: MedidaAdicional[];
  onCambiar: (valores: MedidaAdicional[]) => void;
}

const aElegida = (medida: ExtraMeasure): MedidaAdicional => ({
  code: medida.code, label: medida.label, unitCode: medida.unitCode, nota: '',
});

/** Las medidas propias de una especie, elegidas de un catálogo común (SPEC-105 D-08). */
export function CamposMedidasAdicionales({ valores, onCambiar }: CamposMedidasAdicionalesProps) {
  const { user } = useAuth();
  const puedeCrear = puedeCambiarCriticidad(user?.role.code);
  const { data } = useRequest('extra-measures', async () => inventarioVerdeApi.extraMeasures());
  const { items: unidades } = useCatalog('MEASUREMENT_UNIT');
  const [creadas, setCreadas] = useState<ExtraMeasure[]>([]);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const elegidas = new Set(valores.map((v) => v.code));
  const disponibles = [...(data ?? []), ...creadas].filter((m) => !elegidas.has(m.code));

  function anadir(code: string) {
    const medida = disponibles.find((m) => m.code === code);
    if (medida) onCambiar([...valores, aElegida(medida)]);
  }

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      const nueva = await inventarioVerdeApi.createExtraMeasure({ label: nombre.trim(), unitCode: unidad ?? '' });
      setCreadas((actuales) => [...actuales, nueva]);
      onCambiar([...valores, aElegida(nueva)]);
      setNombre('');
      setUnidad(null);
      setConfirmModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeApiError(err) : 'No se pudo crear la medida.');
      setConfirmModalOpen(false);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-neutral-200/80 pt-3">
      <p className="text-sm font-medium text-neutral-800">Medidas adicionales</p>

      {valores.map((medida) => (
        <fieldset key={medida.code} className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <legend className="px-1 text-sm font-semibold">{medida.label}</legend>
          <Input
            id={`referencia-${medida.code}`}
            label={`Valor de referencia en ${unidadCorta(medida.unitCode)} (opcional)`}
            value={medida.nota}
            maxLength={200}
            onChange={(nota) => onCambiar(valores.map((v) => (v.code === medida.code ? { ...v, nota } : v)))}
            helperText="Orienta a quien mide. Nunca se toma como dato del ejemplar."
          />
          <Button variant="ghost" onClick={() => onCambiar(valores.filter((v) => v.code !== medida.code))}
            aria-label={`Quitar ${medida.label}`}>
            Quitar
          </Button>
        </fieldset>
      ))}

      <Select
        id="anadir-medida"
        label="Añadir medida"
        placeholder="Elegir del catálogo…"
        options={disponibles.map((m, i) => ({
          id: i + 1,
          code: m.code,
          label: `${m.label} (${unidadCorta(m.unitCode)})`,
        }))}
        value=""
        onChange={(opt) => {
          if (opt?.code) anadir(opt.code);
        }}
        disabled={disponibles.length === 0}
      />

      {puedeCrear && (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input id="nueva-medida" label="Nueva medida" value={nombre} onChange={setNombre} maxLength={100} />
          <Select
            id="unidad-medida"
            label="Unidad"
            options={unidades.map((u, i) => ({ id: i + 1, code: u.code, label: u.label }))}
            value={unidad}
            onChange={(o) => setUnidad(o?.code ?? null)}
          />
          <Button
            variant="secondary"
            disabled={!nombre.trim() || !unidad}
            onClick={() => setConfirmModalOpen(true)}
          >
            Crear medida
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-action-danger">{error}</p>}

      {confirmModalOpen && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Crear medida adicional"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setConfirmModalOpen(false)} disabled={creando}>
                Cancelar
              </Button>
              <Button variant="primary" loading={creando} onClick={() => void crear()}>
                Confirmar creación
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Se registrará una nueva medida en el catálogo global del sistema.
            </p>

            <div className="space-y-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm">
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Nombre:</span>
                <span className="font-semibold text-neutral-900">{nombre.trim()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Unidad:</span>
                <span className="font-medium text-neutral-800">
                  {unidades.find((u) => u.code === unidad)?.label ?? unidadCorta(unidad ?? '')}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Esta medida estará disponible para su uso en otras especies. Ten en cuenta que seguirá registrada aunque canceles el registro de esta especie.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
