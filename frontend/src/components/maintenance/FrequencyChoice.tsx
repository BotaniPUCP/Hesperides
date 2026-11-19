'use client';

import type { ReactNode } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** Una línea bajo las opciones. */
  hint?: ReactNode;
}

/** Pocas opciones excluyentes se eligen con radios, a la vista, no con una lista desplegable. */
export function FrequencyChoice<T extends string>({ legend, name, value, options, onChange, hint }: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-neutral-700">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-neutral-800">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)}
              className="accent-brand-600" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </fieldset>
  );
}
