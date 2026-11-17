'use client';

import { useState, type ReactNode } from 'react';
import type { ContactDetail, ContactSummary, OrganizationRef } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useSimilarContacts } from '@/hooks/useDirectory';
import { mensajeDeApiError } from '@/lib/api-errors';
import { directoryApi } from '@/lib/directory-api';
import { useDirectoryCatalog } from './DirectoryCatalog';
import { OrganizationAddRow } from './OrganizationAddRow';
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
  /** Se abre con el «+»: la fila de alta solo aparece cuando hace falta. */
  const [addingOrganization, setAddingOrganization] = useState(false);
  const [extension, setExtension] = useState(contact?.extension ?? '');
  const [mobile, setMobile] = useState(contact?.mobile ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Con el catálogo precargado, los parecidos salen del cliente sin llamar al backend.
  const catalog = useDirectoryCatalog();
  // Mientras el catálogo no esté, respaldo: el endpoint `/similar` de siempre.
  const fallback = useSimilarContacts(fullName, contact === null && !catalog.ready);
  const similar: ContactSummary[] = catalog.ready
    ? catalog.findSimilarContacts(fullName).filter((c) => c.code !== contact?.code)
    : fallback;

  const addOrganization = (o: OrganizationRef | null, role: string | null = null) => {
    if (!o) return;
    setOrganizations((current) => (current.some((c) => c.code === o.code) ? current : [...current, o]));
    if (role) setRoles((current) => ({ ...current, [o.code]: role }));
    setAddingOrganization(false);
  };

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
      catalog.refresh(); // El catálogo ya incluye al nuevo (o sus datos nuevos).
      onSaved({ code, fullName: input.fullName });
    } catch (e) {
      setError(mensajeDeApiError(e));
      setSaving(false);
    }
  }

  return (
      <div className="space-y-4">
        <Input id="contact-name" label="Nombre completo de contacto" value={fullName} onChange={setFullName} required
          maxLength={200} autoFocus />
        <SimilarList
          items={similar.map((s) => ({ code: s.code, title: s.fullName,
            detail: s.organizations.map((o) => o.name).join(', ') }))}
          renderAction={(item) => renderSimilarAction?.(similar.find((s) => s.code === item.code) as ContactSummary)} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-900">Seleccionar la organización a la que pertenece el contacto</p>
          <ul className="flex flex-wrap items-center gap-2">
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
                <button type="button" aria-label={`Quitar ${o.name}`} title={`Quitar ${o.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                  onClick={() => setOrganizations((current) => current.filter((c) => c.code !== o.code))}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
            {/* El «+» vuelve a abrir la fila de alta; con la lista vacía la fila se ve sola (§5.2). */}
            {organizations.length > 0 && (
              <li>
                <button type="button" aria-label="Añadir organización" aria-expanded={addingOrganization}
                  title="Agregar organización"
                  onClick={() => setAddingOrganization((current) => !current)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-neutral-0 text-lg leading-none text-neutral-700 hover:border-neutral-500 hover:text-neutral-900">
                  +
                </button>
              </li>
            )}
          </ul>
          {(organizations.length === 0 || addingOrganization) && (
            <OrganizationAddRow onAdd={addOrganization} />
          )}
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
