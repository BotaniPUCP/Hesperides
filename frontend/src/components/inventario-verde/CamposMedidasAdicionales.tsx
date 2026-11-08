'use client';

import { useState } from 'react';
import type { ExtraMeasure } from '@shared/types';
import { Button, Input, Select } from '@/components/ui';
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
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeApiError(err) : 'No se pudo crear la medida.');
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

      <div className="space-y-1">
        <label htmlFor="anadir-medida" className="block text-sm text-neutral-700">Añadir medida</label>
        <select
          id="anadir-medida"
          value=""
          onChange={(e) => anadir(e.target.value)}
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-sm"
        >
          <option value="">Elegir del catálogo…</option>
          {disponibles.map((m) => (
            <option key={m.code} value={m.code}>{m.label} ({unidadCorta(m.unitCode)})</option>
          ))}
        </select>
      </div>

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
          <Button variant="secondary" loading={creando} disabled={!nombre.trim() || !unidad} onClick={() => void crear()}>
            Crear medida
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-action-danger">{error}</p>}
    </div>
  );
}
