'use client';

import { useMemo, useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { ListStatus } from '@/components/search/ListStatus';
import { Button, Input } from '@/components/ui';
import { useCanMaintainDirectory, useOrganizationList } from '@/hooks/useDirectory';
import { filterByText } from '@/lib/search/searchText';
import { OrganizationFormModal } from './OrganizationFormModal';
import { PickedValue, PickerOption, PickerResults } from './PickerParts';

export interface OrganizationPickerProps {
  id: string;
  label: string;
  value: OrganizationRef | null;
  onChange: (value: OrganizationRef | null) => void;
  helperText?: string;
  errorMessage?: string;
  /** Enfoca el buscador al montarse, cuando el picker se abre bajo demanda (botón «+»). */
  autoFocusSearch?: boolean;
}

const RESULTS = 8;

/**
 * Elegir una organización del Directorio en vez de escribir su nombre (SPEC-106 §5.2).
 * Coordinación puede registrarla ahí mismo; el capataz solo busca y elige. Las coincidencias se
 * calculan sobre la lista precargada, sin consultar por cada letra (SPEC-119).
 */
export function OrganizationPicker({ id, label, value, onChange, helperText, errorMessage,
  autoFocusSearch = false }: OrganizationPickerProps) {
  const canRegister = useCanMaintainDirectory();
  const [text, setText] = useState('');
  const [registering, setRegistering] = useState(false);
  const search = text.trim();
  const list = useOrganizationList(value === null);
  const found = useMemo(() => (search === '' ? [] : filterByText(list.items, search)), [list.items, search]);
  const settled = list.loaded && search !== '';

  function pick(next: OrganizationRef) {
    onChange(next);
    setText('');
    setRegistering(false);
  }

  if (value) {
    return <PickedValue label={label} text={value.name} onClear={() => onChange(null)} />;
  }

  return (
    <div className="space-y-2">
      <Input id={id} label={label} value={text} onChange={setText} type="search" helperText={helperText}
        errorMessage={errorMessage} autoComplete="off" autoFocus={autoFocusSearch} />
      <ListStatus typed={search !== ''} loaded={list.loaded} errorMessage={list.errorMessage} onRetry={list.reload} />
      {settled && (
        <PickerResults empty={found.length === 0}
          emptyText={canRegister ? `«${text.trim()}» no está en el directorio.`
            : `«${text.trim()}» no está en el directorio. Pide a coordinación que la registre.`}
          footer={canRegister && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>
              Registrar «{text.trim()}»
            </Button>
          )}>
          {found.slice(0, RESULTS).map((o) => (
            <PickerOption key={o.code} label={o.name} detail={o.type.label}
              onClick={() => pick({ code: o.code, name: o.name, active: true })} />
          ))}
        </PickerResults>
      )}
      {registering && (
        <OrganizationFormModal organization={null} initialName={text.trim()} onClose={() => setRegistering(false)}
          onSaved={pick}
          renderSimilarAction={(code, name) => (
            <Button size="sm" variant="ghost" onClick={() => pick({ code, name, active: true })}>Usar esta</Button>
          )} />
      )}
    </div>
  );
}
