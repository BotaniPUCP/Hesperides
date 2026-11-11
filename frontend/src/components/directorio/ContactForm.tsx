'use client';

import { useState, type ReactNode } from 'react';
import type { ContactDetail, ContactSummary, OrganizationRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useSimilarContacts } from '@/hooks/useDirectory';
import { mensajeDeApiError } from '@/lib/api-errors';
import { directoryApi } from '@/lib/directory-api';
import { OrganizationPicker } from './OrganizationPicker';
import { SimilarList } from './SimilarList';

export interface ContactPick {
  code: string;
  fullName: string;
}

export interface ContactFormProps {
  /** null registra uno nuevo; un contacto lo edita. Se toma al montar: quien abre pasa una `key` nueva. */
  contact: ContactDetail | null;
  initialName?: string;
  initialOrganizations?: OrganizationRef[];
  onClose: () => void;
  onSaved: (saved: ContactPick) => void;
  /** Qué ofrecer junto a cada parecido: elegirlo, vincularlo o abrirlo. */
  renderSimilarAction?: (similar: ContactSummary) => ReactNode;
}

const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

/** Alta o edición de un contacto. El backend quita espacios y guiones de los teléfonos (SPEC-106 §5.4). */
export function ContactForm({ contact, initialName = '', initialOrganizations = [], onClose, onSaved,
  renderSimilarAction }: ContactFormProps) {
  const [fullName, setFullName] = useState(contact?.fullName ?? initialName);
  const [organizations, setOrganizations] = useState<OrganizationRef[]>(
    contact ? contact.organizations.filter((o) => o.active) : initialOrganizations);
  /** El rol del contacto en cada organización (D-08b), escrito a mano; vacío es sin rol. */
  const [roles, setRoles] = useState<Record<string, string>>(() =>
    Object.fromEntries((contact ? contact.organizations.filter((o) => o.active) : initialOrganizations)
      .filter((o) => o.role).map((o) => [o.code, o.role!])));
  const [extension, setExtension] = useState(contact?.extension ?? '');
  const [mobile, setMobile] = useState(contact?.mobile ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const similar = useSimilarContacts(fullName, contact === null);

  const addOrganization = (o: OrganizationRef | null) =>
    o && setOrganizations((current) => (current.some((c) => c.code === o.code) ? current : [...current, o]));

  async function save() {
    if (fullName.trim() === '') {
      setError('Escribe el nombre completo.');
      return;
    }
    if (organizations.length === 0) {
      setError('Elige al menos una organización.');
      return;
    }
    setSaving(true);
    setError(null);
    const rolesRecord = Object.fromEntries(organizations.map((o) => [o.code, roles[o.code]?.trim() || null]));
    const input = { fullName: fullName.trim(), organizationCodes: organizations.map((o) => o.code), roles: rolesRecord,
      extension: orNull(extension), mobile: orNull(mobile), email: orNull(email) };
    try {
      const code = contact
        ? (await directoryApi.updateContact(contact.code, input), contact.code)
        : (await directoryApi.createContact(input)).code;
      onSaved({ code, fullName: input.fullName });
    } catch (e) {
      setError(mensajeDeApiError(e));
      setSaving(false);
    }
  }

  return (
      <div className="space-y-4">
        <Input id="contact-name" label="Nombre completo" value={fullName} onChange={setFullName} required
          maxLength={200} autoFocus />
        <SimilarList
          items={similar.map((s) => ({ code: s.code, title: s.fullName,
            detail: s.organizations.map((o) => o.name).join(', ') }))}
          renderAction={(item) => renderSimilarAction?.(similar.find((s) => s.code === item.code) as ContactSummary)} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-900">Organizaciones</p>
          <ul className="flex flex-wrap gap-2">
            {organizations.map((o) => (
              <li key={o.code} className="flex items-center gap-1 rounded-full bg-neutral-100 pl-3 pr-1 py-1 text-sm">
                <span>{o.name}</span>
                <input
                  aria-label={`Rol en ${o.name}`}
                  placeholder="Rol (opcional)"
                  value={roles[o.code] ?? ''}
                  onChange={(e) => setRoles((current) => ({ ...current, [o.code]: e.target.value }))}
                  maxLength={100}
                  className="w-36 rounded-full border border-neutral-200 bg-neutral-0 px-2 py-0.5 text-xs text-neutral-900 placeholder:text-neutral-500"
                />
                <button type="button" aria-label={`Quitar ${o.name}`} className="px-1 text-neutral-600 hover:text-neutral-900"
                  onClick={() => setOrganizations((current) => current.filter((c) => c.code !== o.code))}>×</button>
              </li>
            ))}
          </ul>
          <OrganizationPicker id="contact-org" label="Agregar organización" value={null} onChange={addOrganization} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="contact-extension" label="Anexo" value={extension} onChange={setExtension} inputMode="numeric"
            helperText="4 dígitos" />
          <Input id="contact-mobile" label="Celular" value={mobile} onChange={setMobile} type="tel"
            helperText="9 dígitos, empieza con 9" />
        </div>
        <Input id="contact-email" label="Correo" value={email} onChange={setEmail} type="email" maxLength={254} />
        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </div>
      </div>
  );
}
