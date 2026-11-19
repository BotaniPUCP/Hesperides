'use client';

import { useMemo, useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { Button } from '@/components/ui';
import { useCanMaintainDirectory, useOrganizationList } from '@/hooks/useDirectory';
import { filterByText, normalize } from '@/lib/search/searchText';
import { OrganizationFormModal } from './OrganizationFormModal';
import { PickerOption, PickerResults } from './PickerParts';

export interface OrganizationAddRowProps {
  /** Añade la organización con el rol escrito en la fila. */
  onAdd: (organization: OrganizationRef, role: string | null) => void;
  autoFocus?: boolean;
}

/**
 * La fila de alta de una organización con su rol (SPEC-106 §5.2): un solo control
 * dividido por una raya — nombre a la izquierda, rol opcional a la derecha.
 * Se añade eligiendo una sugerencia del catálogo o con Enter si el texto coincide;
 * coordinación puede registrar la que falte ahí mismo. Busca en la lista precargada del
 * Directorio, sin consultar por cada letra (SPEC-119).
 */
export function OrganizationAddRow({ onAdd, autoFocus = false }: OrganizationAddRowProps) {
  const canRegister = useCanMaintainDirectory();
  const { items } = useOrganizationList();
  const [text, setText] = useState('');
  const [role, setRole] = useState('');
  const [registering, setRegistering] = useState(false);

  const results = useMemo(() => (text.trim() === '' ? [] : filterByText(items, text)), [items, text]);
  const exact = useMemo(() => results.find((e) => normalize(e.name) === normalize(text)), [results, text]);
  const showing = text.trim() !== '';

  function add(entry: { code: string; name: string }) {
    onAdd({ code: entry.code, name: entry.name, active: true }, role.trim() === '' ? null : role.trim());
    setText('');
    setRole('');
    setRegistering(false);
  }

  function confirm() {
    if (exact) return add(exact);
    if (results.length === 1) return add(results[0]);
  }

  return (
    <div className="relative space-y-2">
      <div className="flex rounded-md border border-neutral-200 bg-neutral-0 hover:border-neutral-500
          focus-within:border-neutral-500 focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-1">
        <input
          aria-label="Agregar organización"
          placeholder="Nombre de la organización"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          maxLength={200}
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-10 min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 text-base text-neutral-900
            placeholder:text-neutral-500 focus:outline-hidden"
        />
        <div aria-hidden="true" className="w-px bg-neutral-200" />
        <input
          aria-label="Rol de la nueva organización"
          placeholder="Rol (opcional)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          maxLength={100}
          className="h-10 w-44 shrink-0 rounded-r-md border-0 bg-transparent px-3 text-sm text-neutral-900
            placeholder:text-neutral-500 focus:outline-hidden"
        />
      </div>
      {showing && (
        <PickerResults empty={results.length === 0 && !canRegister}
          emptyText={`«${text.trim()}» no está en el directorio. Pide a coordinación que la registre.`}
          footer={canRegister && !exact && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>
              Registrar «{text.trim()}»
            </Button>
          )}>
          {results.map((entry) => (
            <PickerOption key={entry.code} label={entry.name} detail={entry.type.label}
              onClick={() => add(entry)} />
          ))}
        </PickerResults>
      )}
      {registering && (
        <OrganizationFormModal organization={null} initialName={text.trim()} onClose={() => setRegistering(false)}
          onSaved={(saved) => add(saved)} />
      )}
    </div>
  );
}
