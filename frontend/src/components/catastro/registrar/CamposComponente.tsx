'use client';

import { Input } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import type { RegistroComponente } from './useRegistroComponente';

function Opciones({ nombre, leyenda, opciones, valor, onCambiar }: {
  nombre: string; leyenda: string; opciones: { code: string; label: string }[]; valor: string; onCambiar: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-neutral-700">{leyenda}</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        {[{ code: '', label: 'Sin dato' }, ...opciones.filter((o) => o.code !== 'UNKNOWN')].map((o) => (
          <label key={o.code || 'vacio'} className="flex items-center gap-1 text-neutral-900">
            <input type="radio" name={nombre} checked={valor === o.code} onChange={() => onCambiar(o.code)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Lo propio de un tacho: los residuos que recibe (del catálogo) y qué hacer con él. */
export function CamposTacho({ r }: { r: RegistroComponente }) {
  const { items } = useCatalog('WASTE_STREAM');
  const v = r.valores;
  const alternar = (label: string) =>
    r.cambiar('residuos', v.residuos.includes(label) ? v.residuos.filter((x) => x !== label) : [...v.residuos, label]);
  return (
    <div className="space-y-4">
      <fieldset aria-describedby={r.errores.residuos ? 'residuos-error' : undefined}>
        <legend className="mb-1 text-sm font-medium text-neutral-700">Residuos que recibe</legend>
        <div className="grid gap-1 text-sm sm:grid-cols-3">
          {items.map((i) => (
            <label key={i.code} className="flex items-center gap-2 text-neutral-900">
              <input type="checkbox" checked={v.residuos.includes(i.label)} onChange={() => alternar(i.label)} />
              {i.label}
            </label>
          ))}
        </div>
        {r.errores.residuos && <p id="residuos-error" className="mt-1 text-xs text-action-danger">{r.errores.residuos}</p>}
      </fieldset>
      <Input id="accion" label="Acción" value={v.accion} onChange={(x) => r.cambiar('accion', x)} helperText="Mantener, Retirar, Reubicar…" />
      <Input id="recomendaciones" label="Recomendaciones" value={v.recomendaciones} onChange={(x) => r.cambiar('recomendaciones', x)} />
    </div>
  );
}

/** Lo propio de un bebedero: tipo y estado de sus catálogos, y el sector del registro. */
export function CamposBebedero({ r }: { r: RegistroComponente }) {
  const tipos = useCatalog('FOUNTAIN_KIND').items;
  const estados = useCatalog('FOUNTAIN_STATUS').items;
  const v = r.valores;
  return (
    <div className="space-y-4">
      <Opciones nombre="tipo" leyenda="Tipo" opciones={tipos} valor={v.tipo} onCambiar={(x) => r.cambiar('tipo', x)} />
      <Opciones nombre="estado" leyenda="Estado" opciones={estados} valor={v.estado} onCambiar={(x) => r.cambiar('estado', x)} />
      <Input id="sector" label="Sector" value={v.sector} onChange={(x) => r.cambiar('sector', x)} helperText="CAMPUS, CIA, EEGGCC, EEGGLL, AULARIO" />
    </div>
  );
}
