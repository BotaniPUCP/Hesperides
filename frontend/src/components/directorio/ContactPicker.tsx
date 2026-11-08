'use client';

import { useState } from 'react';
import type { ContactSummary, OrganizationRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useCanMaintainDirectory, useContacts } from '@/hooks/useDirectory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { mensajeDeApiError } from '@/lib/api-errors';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { directoryApi } from '@/lib/directory-api';
import { ContactFormModal, type ContactPick } from './ContactFormModal';
import { PickedValue, PickerOption, PickerResults } from './PickerParts';

export interface ContactPickerProps {
  id: string;
  label: string;
  /** La organización ya elegida en el formulario: el contacto se busca dentro de ella. */
  organization: OrganizationRef | null;
  value: ContactPick | null;
  onChange: (value: ContactPick | null) => void;
}

const RESULTS = 8;
const organizationsOf = (c: ContactSummary) => c.organizations.map((o) => o.name).join(', ');

/**
 * Elegir la persona de contacto de una organización (SPEC-106 §5.2). Si no está en
 * ella pero sí en otra, coordinación la vincula en vez de registrarla dos veces.
 */
export function ContactPicker({ id, label, organization, value, onChange }: ContactPickerProps) {
  const canMaintain = useCanMaintainDirectory();
  const [text, setText] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const active = organization !== null && value === null && search !== '';
  const inside = useContacts({ search, organizationCode: organization?.code }, 0, 0, active);
  const settled = active && !inside.loading && search === text.trim();
  const lookElsewhere = settled && inside.result.items.length === 0;
  const elsewhere = useContacts({ search }, 0, 0, lookElsewhere);
  const others = elsewhere.result.items.filter((c) => !c.organizations.some((o) => o.code === organization?.code));

  function pick(next: ContactPick) {
    onChange(next);
    setText('');
    setRegistering(false);
  }

  async function link(contact: ContactSummary) {
    setError(null);
    try {
      await directoryApi.linkContact(contact.code, (organization as OrganizationRef).code);
      pick({ code: contact.code, fullName: contact.fullName });
    } catch (e) {
      setError(mensajeDeApiError(e));
    }
  }

  const linkButton = (c: ContactSummary) => canMaintain && organization && (
    <Button size="sm" variant="secondary" onClick={() => link(c)}>Vincular a {organization.name}</Button>
  );

  if (value) return <PickedValue label={label} text={value.fullName} onClear={() => onChange(null)} />;
  if (organization === null) {
    return <Input id={id} label={label} value="" onChange={() => undefined} disabled
      helperText="Elige primero la organización." />;
  }

  return (
    <div className="space-y-2">
      <Input id={id} label={label} value={text} onChange={setText} type="search" autoComplete="off" />
      {settled && (!lookElsewhere || !elsewhere.loading) && (
        <PickerResults empty={inside.result.items.length === 0 && others.length === 0}
          emptyText={canMaintain ? `«${text.trim()}» no está en el directorio.`
            : `«${text.trim()}» no está en ${organization.name}. Pide a coordinación que lo registre.`}
          footer={canMaintain && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>Registrar «{text.trim()}»</Button>
          )}>
          {inside.result.items.slice(0, RESULTS).map((c) => (
            <PickerOption key={c.code} label={c.fullName} onClick={() => pick({ code: c.code, fullName: c.fullName })} />
          ))}
          {others.slice(0, RESULTS).map((c) => (
            <PickerOption key={c.code} label={c.fullName} detail={organizationsOf(c)} action={linkButton(c)} />
          ))}
          {!canMaintain && others.length > 0 && (
            <li className="px-2 text-sm text-neutral-600">
              Está en otra organización: pide a coordinación que lo vincule a {organization.name}.
            </li>
          )}
        </PickerResults>
      )}
      {error && <p role="alert" className="text-sm text-alert-danger-fg">{error}</p>}
      {registering && (
        <ContactFormModal contact={null} initialName={text.trim()} initialOrganizations={[organization]}
          onClose={() => setRegistering(false)} onSaved={pick} renderSimilarAction={linkButton} />
      )}
    </div>
  );
}
