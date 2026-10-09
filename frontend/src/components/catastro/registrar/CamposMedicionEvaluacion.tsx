'use client';

import { Input } from '@/components/ui';
import { PREGUNTAS_EVALUACION } from './formularioPlanta';
import { PreguntaSiNo } from './PreguntaSiNo';
import type { RegistroPlanta } from './useRegistroPlanta';

function CampoFecha({ id, etiqueta, valor, onCambiar, error }: {
  id: string; etiqueta: string; valor: string; onCambiar: (v: string) => void; error?: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">{etiqueta}</label>
      <input
        id={id}
        type="date"
        max={hoy}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
      />
      {error && <p id={`${id}-error`} className="text-xs text-action-danger">{error}</p>}
    </div>
  );
}

/** Opcional: si se mide algo, la fecha decide cuál medición es la vigente. */
export function CamposMedicion({ r }: { r: RegistroPlanta }) {
  const v = r.valores;
  return (
    <details className="rounded-lg border border-neutral-200 p-4" open={Boolean(v.alturaM || v.dapCm)}>
      <summary className="cursor-pointer font-semibold text-neutral-900">Medición (opcional)</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <CampoFecha id="fecha-medicion" etiqueta="Fecha de medición" valor={v.fechaMedicion}
          onCambiar={(x) => r.cambiar('fechaMedicion', x)} error={r.errores.fechaMedicion} />
        <Input id="altura" label="Altura (m)" type="number" value={v.alturaM} onChange={(x) => r.cambiar('alturaM', x)} />
        <Input id="fuste" label="Altura del fuste (m)" type="number" value={v.alturaFusteM} onChange={(x) => r.cambiar('alturaFusteM', x)} />
        <Input id="dap" label="DAP (cm)" type="number" value={v.dapCm} onChange={(x) => r.cambiar('dapCm', x)}
          helperText="Diámetro a 1.30 m del suelo" />
        <Input id="copa" label="Radio de copa (m)" type="number" value={v.radioCopaM} onChange={(x) => r.cambiar('radioCopaM', x)} />
        <PreguntaSiNo id="zunchado" pregunta="Zunchado" valor={v.zunchado} onCambiar={(x) => r.cambiar('zunchado', x)} />
      </div>
      {r.errores.medidas && <p className="mt-2 text-xs text-action-danger">{r.errores.medidas}</p>}
    </details>
  );
}

/** Opcional: la primera evaluación del historial de la planta (SPEC-103 D-06). */
export function CamposEvaluacion({ r }: { r: RegistroPlanta }) {
  const v = r.valores;
  return (
    <details className="rounded-lg border border-neutral-200 p-4">
      <summary className="cursor-pointer font-semibold text-neutral-900">Evaluación (opcional)</summary>
      <div className="mt-4 space-y-3">
        <CampoFecha id="fecha-evaluacion" etiqueta="Fecha de evaluación" valor={v.fechaEvaluacion}
          onCambiar={(x) => r.cambiar('fechaEvaluacion', x)} error={r.errores.fechaEvaluacion} />
        <div className="divide-y divide-neutral-100">
          {PREGUNTAS_EVALUACION.map(([clave, pregunta]) => (
            <PreguntaSiNo key={clave} id={`eval-${clave}`} pregunta={pregunta} valor={v.respuestas[clave]}
              onCambiar={(x) => r.cambiar('respuestas', { ...v.respuestas, [clave]: x })} />
          ))}
        </div>
        <Input id="manejo" label="Manejo recomendado" value={v.manejo} maxLength={200} onChange={(x) => r.cambiar('manejo', x)} />
        <Input id="observacion-evaluacion" label="Observación de la evaluación" value={v.observacionEvaluacion}
          onChange={(x) => r.cambiar('observacionEvaluacion', x)} />
      </div>
    </details>
  );
}
