'use client';

import { useState, type ReactNode } from 'react';
import type { OrganizationDetail, OrganizationRef, OrganizationTypeCode } from '@shared/types';
import { Button, Input, Textarea } from '@/components/ui';
import { useSimilarOrganizations } from '@/hooks/useDirectory';
import { mensajeDeApiError } from '@/lib/api-errors';
import { directoryApi } from '@/lib/directory-api';
import { SimilarList } from './SimilarList';

export interface OrganizationFormProps {
  /** null registra una nueva; una organización la edita. Se toma al montar: quien abre pasa una `key` nueva. */
  organization: OrganizationDetail | null;
  initialName?: string;
  /** Cancelar: cerrar el diálogo o volver. */
  onClose: () => void;
  onSaved: (saved: OrganizationRef) => void;
  /** Qué ofrecer junto a cada parecido: elegirlo en un formulario o abrirlo. */
  renderSimilarAction?: (code: string, name: string) => ReactNode;
}

const TYPES: { code: OrganizationTypeCode; label: string }[] = [
  { code: 'PUCP_UNIT', label: 'Unidad PUCP' },
  { code: 'EXTERNAL_COMPANY', label: 'Empresa externa' },
];

const aliasesFrom = (text: string) => text.split('\n').map((a) => a.trim()).filter((a) => a !== '');
const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

/** Alta o edición de una organización (SPEC-106 §5.1). El RUC solo aparece para empresas. */
export function OrganizationForm({ organization, initialName = '', onClose, onSaved, renderSimilarAction }:
  OrganizationFormProps) {
  const [name, setName] = useState(organization?.name ?? initialName);
  const [typeCode, setTypeCode] = useState<OrganizationTypeCode>(
    (organization?.type.code as OrganizationTypeCode | undefined) ?? 'PUCP_UNIT');
  const [ruc, setRuc] = useState(organization?.ruc ?? '');
  const [phone, setPhone] = useState(organization?.phone ?? '');
  const [aliases, setAliases] = useState((organization?.aliases ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const similar = useSimilarOrganizations(name, organization === null)
    .filter((s) => s.code !== organization?.code);
  const isCompany = typeCode === 'EXTERNAL_COMPANY';

  async function save() {
    if (name.trim() === '') {
      setError('Escribe el nombre de la organización.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = { name: name.trim(), typeCode, ruc: isCompany ? orNull(ruc) : null, phone: orNull(phone),
      aliases: aliasesFrom(aliases) };
    try {
      const code = organization
        ? (await directoryApi.updateOrganization(organization.code, input), organization.code)
        : (await directoryApi.createOrganization(input)).code;
      onSaved({ code, name: input.name, active: true });
    } catch (e) {
      setError(mensajeDeApiError(e));
      setSaving(false);
    }
  }

  return (
      <div className="space-y-4">
        <Input id="org-name" label="Nombre" value={name} onChange={setName} required maxLength={200} autoFocus />
        <SimilarList items={similar.map((s) => ({ code: s.code, title: s.name }))}
          renderAction={(item) => renderSimilarAction?.(item.code, item.title)} />
        <fieldset>
          <legend className="text-sm font-medium text-neutral-900">Tipo</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {TYPES.map((t) => (
              <label key={t.code} className="flex items-center gap-2 text-sm text-neutral-800">
                <input type="radio" name="org-type" checked={typeCode === t.code} onChange={() => setTypeCode(t.code)} />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        {isCompany && (
          <Input id="org-ruc" label="RUC" value={ruc} onChange={setRuc} inputMode="numeric" maxLength={11}
            helperText="11 dígitos; empieza con 10 (persona natural) o 20 (empresa)." />
        )}
        <Input id="org-phone" label="Teléfono" value={phone} onChange={setPhone} type="tel" maxLength={30} />
        <Textarea id="org-aliases" label="Otros nombres (uno por línea)" value={aliases} onChange={setAliases}
          helperText="Siglas o variantes con que la conocen, como «EEGGCC»." />
        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </div>
      </div>
  );
}
