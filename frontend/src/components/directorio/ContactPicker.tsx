'use client';

import { useState } from 'react';
import type { ContactSummary, OrganizationRef } from '@shared/types';
import { Button, Input, Modal } from '@/components/ui';
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
  /** Buscar en todo el Directorio cuando no hay organización fija (SPEC-107 §5.1, el responsable). */
  searchEverywhere?: boolean;
  value: ContactPick | null;
  onChange: (value: ContactPick | null) => void;
}

const RESULTS = 8;
const organizationsOf = (c: ContactSummary) => c.organizations.map((o) => o.name).join(', ');

/**
 * Pide el rol del vínculo (D-08b) antes de crearlo; vacío es sin rol. Si el
 * contacto ya pertenece, el backend responde 409 y el mismo diálogo pasa a
 * editar el rol de su vínculo, sin crear otro.
 */
function RoleAsk({ contact, organization, onClose, onDone }:
  { contact: ContactSummary; organization: OrganizationRef; onClose: () => void; onDone: (pick: ContactPick) => void }) {
  const [role, setRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);

  async function confirm() {
    setPending(true);
    setError(null);
    const value = role.trim() === '' ? null : role.trim();
    try {
      if (editing) {
        await directoryApi.updateLinkRole(contact.code, organization.code, value);
      } else {
        await directoryApi.linkContact(contact.code, organization.code, value);
      }
      onDone({ code: contact.code, fullName: contact.fullName });
    } catch (e) {
      if (!editing && (e as { status?: number }).status === 409) {
        setEditing(true);
      } else {
        setError(mensajeDeApiError(e));
      }
      setPending(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Vincular a ${organization.name}`} size="sm"
      footer={<div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button onClick={confirm} loading={pending}>Vincular</Button>
      </div>}>
      <div className="space-y-3 text-sm text-neutral-700">
        <p>
          {editing
            ? `${contact.fullName} ya pertenece a ${organization.name}. No se crea otro vínculo: se conserva y aquí fijas o cambias su rol.`
            : `${contact.fullName} pasará a pertenecer a ${organization.name}. Su rol en ella es opcional.`}
        </p>
        <Input id="link-role" label="Rol en la organización" value={role} onChange={setRole}
          maxLength={100} helperText="Opcional, hasta 100 caracteres." />
        {error && <p role="alert" className="text-sm text-alert-danger-fg">{error}</p>}
      </div>
    </Modal>
  );
}

/**
 * Elegir la persona de contacto de una organización (SPEC-106 §5.2). Si no está en
 * ella pero sí en otra, coordinación la vincula en vez de registrarla dos veces; el
 * rol del vínculo se pide ahí mismo y, si ya pertenece, se ofrece editar su rol.
 * Con `searchEverywhere` busca en todo el Directorio y no vincula: cualquier
 * contacto vale, como el responsable de una reserva (SPEC-107 D-02).
 */
export function ContactPicker({ id, label, organization, searchEverywhere = false, value, onChange }: ContactPickerProps) {
  const canMaintain = useCanMaintainDirectory();
  const [text, setText] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<ContactSummary | null>(null);
  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const free = searchEverywhere && organization === null;
  const active = (organization !== null || free) && value === null && search !== '';
  const inside = useContacts(free ? { search } : { search, organizationCode: organization?.code }, 0, 0, active);
  const settled = active && !inside.loading && search === text.trim();
  const lookElsewhere = !free && settled && inside.result.items.length === 0;
  const elsewhere = useContacts({ search }, 0, 0, lookElsewhere);
  const others = elsewhere.result.items.filter((c) => !c.organizations.some((o) => o.code === organization?.code));

  function pick(next: ContactPick) {
    onChange(next);
    setText('');
    setRegistering(false);
    setLinking(null);
  }

  const linkButton = (c: ContactSummary) => canMaintain && organization && (
    <Button size="sm" variant="secondary" onClick={() => setLinking(c)}>Vincular a {organization.name}</Button>
  );

  if (value) return <PickedValue label={label} text={value.fullName} onClear={() => onChange(null)} />;
  if (organization === null && !free) {
    return <Input id={id} label={label} value="" onChange={() => undefined} disabled
      helperText="Elige primero la organización." />;
  }

  return (
    <div className="space-y-2">
      <Input id={id} label={label} value={text} onChange={setText} type="search" autoComplete="off"
        helperText={free ? 'Cualquier contacto del Directorio.' : undefined} />
      {settled && (!lookElsewhere || !elsewhere.loading) && (
        <PickerResults empty={inside.result.items.length === 0 && others.length === 0}
          emptyText={canMaintain ? `«${text.trim()}» no está en el directorio.`
            : `«${text.trim()}» no está en ${organization?.name}. Pide a coordinación que lo registre.`}
          footer={canMaintain && (
            <Button size="sm" variant="secondary" onClick={() => setRegistering(true)}>Registrar «{text.trim()}»</Button>
          )}>
          {inside.result.items.slice(0, RESULTS).map((c) => (
            <PickerOption key={c.code} label={c.fullName}
              detail={free || organization === null ? organizationsOf(c)
                : c.organizations.find((o) => o.code === organization.code)?.role ?? undefined}
              onClick={() => pick({ code: c.code, fullName: c.fullName })} />
          ))}
          {others.slice(0, RESULTS).map((c) => (
            <PickerOption key={c.code} label={c.fullName} detail={organizationsOf(c)} action={linkButton(c)} />
          ))}
          {!canMaintain && !free && others.length > 0 && organization && (
            <li className="px-2 text-sm text-neutral-600">
              Está en otra organización: pide a coordinación que lo vincule a {organization.name}.
            </li>
          )}
        </PickerResults>
      )}
      {error && <p role="alert" className="text-sm text-alert-danger-fg">{error}</p>}
      {registering && (
        <ContactFormModal contact={null} initialName={text.trim()}
          initialOrganizations={organization ? [organization] : []}
          onClose={() => setRegistering(false)} onSaved={pick}
          renderSimilarAction={free ? undefined : linkButton} />
      )}
      {linking && organization && (
        <RoleAsk key={linking.code} contact={linking} organization={organization}
          onClose={() => setLinking(null)} onDone={pick} />
      )}
    </div>
  );
}
