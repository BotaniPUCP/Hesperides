'use client';

import { useId } from 'react';
import type { SystemParameter } from '@shared/types';

interface CampoValorProps {
  parametro: SystemParameter;
  valor: string;
  onChange?: (valor: string) => void;
}

const INPUT_CLASS =
  'h-8 w-44 rounded border border-neutral-200 bg-white px-2 text-sm text-neutral-900 ' +
  'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

/**
 * El control del valor, elegido por `valueType`: BOOLEAN → desplegable Sí/No,
 * INTEGER/DECIMAL → input numérico, STRING → texto.
 *
 * Un parámetro con `isEditable: false` se pinta bloqueado y con el aviso en gris
 * debajo: sin él, un campo gris parece un fallo de carga y no una decisión. El
 * aviso va enlazado con aria-describedby porque un lector de pantalla no anuncia
 * el color, y "atenuado" solo no dice por qué.
 */
export function CampoValor({ parametro, valor, onChange }: CampoValorProps) {
  const avisoId = useId();
  const restringido = !parametro.isEditable;
  const comun = {
    'aria-label': `Valor de ${parametro.label}`,
    'aria-describedby': restringido ? avisoId : undefined,
    value: valor,
    disabled: restringido,
    className: INPUT_CLASS,
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {parametro.valueType === 'BOOLEAN' ? (
        <select {...comun} onChange={(evento) => onChange?.(evento.target.value)}>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          {...comun}
          type={esNumerico(parametro) ? 'number' : 'text'}
          onChange={(evento) => onChange?.(evento.target.value)}
        />
      )}
      {restringido ? (
        <p id={avisoId} className="text-xs text-neutral-500">
          Parámetro restringido
        </p>
      ) : null}
    </div>
  );
}

function esNumerico(parametro: SystemParameter): boolean {
  return parametro.valueType === 'INTEGER' || parametro.valueType === 'DECIMAL';
}
