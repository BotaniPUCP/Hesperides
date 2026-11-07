'use client';

import type { SpecimenDetail } from '@shared/types';
import { Input, LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { unidadCorta } from '@/components/inventario-verde/medidasEspecie';
import { decisionInicial, opcionesDe, type DecisionPoda } from './cierrePoda';

export interface MedidasCierrePodaProps {
  codigos: string[];
  decisiones: Record<string, DecisionPoda>;
  onCambiar: (decisiones: Record<string, DecisionPoda>) => void;
  hoy: string;
  errores?: Record<string, string>;
  disabled?: boolean;
}

function CamposMedicion({ ejemplar, decision, onCambiar, hoy, disabled }: {
  ejemplar: SpecimenDetail; decision: DecisionPoda; onCambiar: (d: DecisionPoda) => void; hoy: string; disabled: boolean;
}) {
  const id = (campo: string) => `poda-${ejemplar.code}-${campo}`;
  const campo = (nombre: 'altura' | 'fuste' | 'dap' | 'copa', etiqueta: string) => (
    <Input id={id(nombre)} label={etiqueta} value={decision[nombre]} disabled={disabled}
      onChange={(valor) => onCambiar({ ...decision, [nombre]: valor })} />
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 pt-2">
      <label htmlFor={id('fecha')} className="grid gap-1 text-sm">
        Fecha de la medición
        <input id={id('fecha')} type="date" max={hoy} value={decision.fecha} disabled={disabled}
          onChange={(e) => onCambiar({ ...decision, fecha: e.target.value })}
          className="h-11 rounded-md border border-neutral-200 p-2" />
      </label>
      {campo('altura', 'Altura (m)')}
      {campo('copa', 'Radio de copa (m)')}
      {ejemplar.species.usesTrunkHeight && campo('fuste', 'Fuste (m)')}
      {ejemplar.species.usesDbh && campo('dap', 'DAP (cm)')}
      {ejemplar.species.extraMeasures.map((medida) => (
        <Input key={medida.code} id={id(medida.code)} label={`${medida.label} (${unidadCorta(medida.unitCode)})`}
          value={decision.adicionales?.[medida.code] ?? ''} disabled={disabled} helperText={medida.referenceNote ?? undefined}
          onChange={(valor) => onCambiar({ ...decision, adicionales: { ...decision.adicionales, [medida.code]: valor } })} />
      ))}
    </div>
  );
}

/** Qué pasa con las medidas de cada ejemplar al cerrar una poda (SPEC-105 §5.3 y §7). */
export function MedidasCierrePoda({ codigos, decisiones, onCambiar, hoy, errores = {}, disabled = false }: MedidasCierrePodaProps) {
  const { data, loading, errorMessage } = useRequest(`cierre-poda:${codigos.join(',')}`, () =>
    Promise.all(codigos.map((codigo) => inventarioVerdeApi.specimen(codigo))),
  );

  if (loading) return <LoadingSkeleton variant="card" />;
  if (errorMessage || !data) {
    return <p role="status" className="text-sm text-neutral-600">No se pudieron cargar los ejemplares: esta poda se cerrará sin cambiar sus medidas.</p>;
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Medidas tras la poda</h4>
      <div className="max-h-96 space-y-3 overflow-y-auto">
        {data.map((ejemplar) => {
          const decision = decisiones[ejemplar.code] ?? decisionInicial(hoy);
          const cambiar = (d: DecisionPoda) => onCambiar({ ...decisiones, [ejemplar.code]: d });
          const nombre = ejemplar.species.commonName || ejemplar.species.scientificName;
          return (
            <fieldset key={ejemplar.code} className="space-y-2 rounded-md border border-neutral-200 p-3">
              <legend className="px-1 text-sm font-semibold">{ejemplar.code} · {nombre}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {opcionesDe(ejemplar).map((opcion) => (
                  <label key={opcion.valor} className="flex items-center gap-1.5">
                    <input type="radio" name={`poda-${ejemplar.code}`} checked={decision.opcion === opcion.valor}
                      disabled={disabled} onChange={() => cambiar({ ...decision, opcion: opcion.valor })} />
                    {opcion.etiqueta}
                  </label>
                ))}
              </div>
              {decision.opcion === 'MEASURED' && (
                <CamposMedicion ejemplar={ejemplar} decision={decision} onCambiar={cambiar} hoy={hoy} disabled={disabled} />
              )}
              {errores[ejemplar.code] && <p role="alert" className="text-xs text-action-danger">{errores[ejemplar.code]}</p>}
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
