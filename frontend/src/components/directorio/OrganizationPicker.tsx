'use client';

import { useMemo, useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { asRef, useDirectoryCatalog } from './DirectoryCatalog';
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
 * Filtra el catálogo precargado en el cliente: ninguna búsqueda va al backend.
 * Coordinación puede registrarla ahí mismo; el capataz solo busca y elige.
 */
export function OrganizationPicker({ id, label, value, onChange, helperText, errorMessage,
  autoFocusSearch = false }: OrganizationPickerProps) {
  const canRegister = useCanMaintainDirectory();
  const catalog = useDirectoryCatalog();
  const [text, setText] = useState('');
  const [registering, setRegistering] = useState(false);
  // El listado solo muestra vigentes: una dada de baja no vuelve a usarse.
  const results = useMemo(() => catalog.filter(text.trim()).filter((e) => e.active), [catalog, text]);
  const settled = text.trim() !== '';

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
      {settled && (
        <PickerResults empty={results.length === 0}
          emptyText={canRegister ? `«${text.trim()}» no está en el directorio.`
            : `«${text.trim()}» no está en el directorio. Pide a coordinación que la registre.`}
          footer={canRegister && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>
              Registrar «{text.trim()}»
            </Button>
          )}>
          {results.slice(0, RESULTS).map((entry) => (
            <PickerOption key={entry.code} label={entry.name} detail={entry.type.label}
              onClick={() => pick(asRef(entry))} />
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
