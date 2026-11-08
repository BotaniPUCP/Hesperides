'use client';

import { useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useCanMaintainDirectory, useOrganizations } from '@/hooks/useDirectory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { OrganizationFormModal } from './OrganizationFormModal';
import { PickedValue, PickerOption, PickerResults } from './PickerParts';

export interface OrganizationPickerProps {
  id: string;
  label: string;
  value: OrganizationRef | null;
  onChange: (value: OrganizationRef | null) => void;
  helperText?: string;
  errorMessage?: string;
}

const RESULTS = 8;

/**
 * Elegir una organización del Directorio en vez de escribir su nombre (SPEC-106 §5.2).
 * Coordinación puede registrarla ahí mismo; el capataz solo busca y elige.
 */
export function OrganizationPicker({ id, label, value, onChange, helperText, errorMessage }: OrganizationPickerProps) {
  const canRegister = useCanMaintainDirectory();
  const [text, setText] = useState('');
  const [registering, setRegistering] = useState(false);
  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const { result, loading } = useOrganizations({ search }, 0, 0, value === null && search !== '');
  const settled = !loading && search === text.trim() && search !== '';

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
        errorMessage={errorMessage} autoComplete="off" />
      {settled && (
        <PickerResults empty={result.items.length === 0}
          emptyText={canRegister ? `«${text.trim()}» no está en el directorio.`
            : `«${text.trim()}» no está en el directorio. Pide a coordinación que la registre.`}
          footer={canRegister && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>
              Registrar «{text.trim()}»
            </Button>
          )}>
          {result.items.slice(0, RESULTS).map((o) => (
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
