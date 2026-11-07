'use client';

import { Card, Input, Select } from '@/components/ui';
import { puedeCambiarCriticidad } from '@/components/catastro/permisos';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { CamposMedidasAdicionales } from './CamposMedidasAdicionales';
import type { ErroresMedidas, MedidasEspecie } from './medidasEspecie';

export interface CamposMedidasEspecieProps {
  valores: MedidasEspecie;
  onCambiar: (valores: MedidasEspecie) => void;
  errores?: ErroresMedidas;
  /** Aviso del formulario sobre la criticidad, por ejemplo tras cambiar el tipo al editar. */
  aviso?: string | null;
}

function Casilla({ id, etiqueta, marcada, deshabilitada = false, onCambiar }: {
  id: string; etiqueta: string; marcada: boolean; deshabilitada?: boolean; onCambiar: (marcada: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-neutral-800">
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        disabled={deshabilitada}
        onChange={(e) => onCambiar(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded-xs border-neutral-300 disabled:opacity-60"
      />
      <span>{etiqueta}</span>
    </label>
  );
}

/** El bloque de medidas de una especie: lo comparten el registro, el modal y la edición (SPEC-105 §7). */
export function CamposMedidasEspecie({ valores, onCambiar, errores = {}, aviso }: CamposMedidasEspecieProps) {
  const { user } = useAuth();
  const puedeCambiar = puedeCambiarCriticidad(user?.role.code);
  const { items: fuentes, isLoading } = useCatalog('REFERENCE_VALUE_SOURCE');
  const opciones = fuentes.map((f, i) => ({ id: i + 1, code: f.code, label: f.label }));
  const cambiar = (parcial: Partial<MedidasEspecie>) => onCambiar({ ...valores, ...parcial });

  return (
    <Card title="Medidas de la especie">
      <div className="space-y-4">
        <div className="space-y-1">
          <Casilla
            id="especie-critica"
            etiqueta="Especie crítica: su altura decide cómo se atiende"
            marcada={valores.critical}
            deshabilitada={!puedeCambiar}
            onCambiar={(critical) => cambiar({ critical })}
          />
          <p className="pl-6 text-xs text-neutral-500">
            {puedeCambiar
              ? 'Un árbol de más de 5 m va con grúa y una trepadora alta puede requerir escalera. Si no es crítica, sus ejemplares sin medir muestran el promedio.'
              : 'Solo Administración o Coordinación pueden cambiar la criticidad.'}
          </p>
          {aviso && <p className="pl-6 text-xs font-medium text-alert-warning-fg">{aviso}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="promedio-altura"
            label="Altura promedio (m)"
            value={valores.alturaM}
            onChange={(alturaM) => cambiar({ alturaM })}
            required={!valores.critical}
            errorMessage={errores.altura}
            placeholder="Ej. 2.5"
          />
          <Select
            id="fuente-altura"
            label="Fuente de la altura"
            options={opciones}
            value={valores.fuenteAltura}
            onChange={(o) => cambiar({ fuenteAltura: o?.code ?? null })}
            loading={isLoading}
            clearable
            required={!valores.critical}
            errorMessage={errores.fuenteAltura}
          />
          <Input
            id="promedio-radio"
            label="Radio de copa promedio (m)"
            value={valores.radioM}
            onChange={(radioM) => cambiar({ radioM })}
            required={!valores.critical}
            errorMessage={errores.radio}
            placeholder="Ej. 1.2"
          />
          <Select
            id="fuente-radio"
            label="Fuente del radio"
            options={opciones}
            value={valores.fuenteRadio}
            onChange={(o) => cambiar({ fuenteRadio: o?.code ?? null })}
            loading={isLoading}
            clearable
            required={!valores.critical}
            errorMessage={errores.fuenteRadio}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-neutral-800">Altura y radio de copa siempre aplican. Además:</legend>
          <Casilla id="usa-fuste" etiqueta="Se mide el fuste" marcada={valores.usaFuste} onCambiar={(usaFuste) => cambiar({ usaFuste })} />
          <Casilla id="usa-dap" etiqueta="Se mide el DAP" marcada={valores.usaDap} onCambiar={(usaDap) => cambiar({ usaDap })} />
        </fieldset>

        <CamposMedidasAdicionales valores={valores.adicionales} onCambiar={(adicionales) => cambiar({ adicionales })} />
      </div>
    </Card>
  );
}
