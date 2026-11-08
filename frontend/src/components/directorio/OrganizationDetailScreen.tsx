'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OrganizationDetail } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { useCanMaintainDirectory, useOrganization } from '@/hooks/useDirectory';
import { directoryApi } from '@/lib/directory-api';
import { ContactFormModal } from './ContactFormModal';
import { DeactivateAction } from './DeactivateAction';
import { DetailFrame, DetailHeader, Field, InactiveBadge } from './DetailParts';
import { OrganizationFormModal } from './OrganizationFormModal';

/** Ficha de una organización con sus contactos (SPEC-106 §7). Una dada de baja se lee, no se cambia. */
export function OrganizationDetailScreen({ code }: { code: string }) {
  const { organization, loading, errorMessage, notFound, reload } = useOrganization(code);
  return (
    <DetailFrame loading={loading} notFound={notFound} errorMessage={errorMessage}>
      {() => <OrganizationView organization={organization as OrganizationDetail} reload={reload} />}
    </DetailFrame>
  );
}

function OrganizationView({ organization, reload }: { organization: OrganizationDetail; reload: () => void }) {
  const canChange = useCanMaintainDirectory() && organization.active;
  const router = useRouter();
  const [editing, setEditing] = useState(0);
  const [addingContact, setAddingContact] = useState(0);
  const ref = { code: organization.code, name: organization.name, active: organization.active };

  return (
    <div className="space-y-6">
      <DetailHeader title={organization.name} badge={!organization.active && <InactiveBadge label="Dada de baja" />}
        description={`${organization.type.label} · ${organization.code}`}
        actions={canChange && (<>
          <Button variant="secondary" onClick={() => setEditing((n) => n + 1)}>Editar</Button>
          <DeactivateAction title={`Dar de baja «${organization.name}»`}
            deactivate={() => directoryApi.deactivateOrganization(organization.code)}
            onDone={() => router.push('/directorio')}>
            Dejará de aparecer en búsquedas y formularios. Lo que ya la usaba la sigue mostrando, y sus contactos
            no se dan de baja: pueden pertenecer a otras organizaciones.
          </DeactivateAction>
        </>)} />
      <Card title="Datos">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">{organization.type.label}</Field>
          {organization.type.code === 'EXTERNAL_COMPANY' && <Field label="RUC">{organization.ruc}</Field>}
          <Field label="Teléfono">{organization.phone}</Field>
          <Field label="Otros nombres">
            {organization.aliases.length > 0 ? organization.aliases.join(', ') : null}
          </Field>
        </dl>
      </Card>
      <Card title="Contactos" actions={canChange && (
        <Button size="sm" onClick={() => setAddingContact((n) => n + 1)}>Registrar contacto</Button>
      )}>
        {organization.contacts.length === 0 ? (
          <p className="text-sm text-neutral-600">Aún no tiene contactos.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {organization.contacts.map((c) => (
              <li key={c.code} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/directorio/contactos/${c.code}`} className="font-medium text-forest-800 hover:underline">
                  {c.fullName}
                </Link>
                <span className="text-sm text-neutral-600">
                  {[c.extension && `Anexo ${c.extension}`, c.mobile, c.email].filter(Boolean).join(' · ') || 'Sin teléfono ni correo'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing > 0 && (
        <OrganizationFormModal key={editing} organization={organization} onClose={() => setEditing(0)}
          onSaved={() => { setEditing(0); reload(); }} />
      )}
      {addingContact > 0 && (
        <ContactFormModal key={addingContact} contact={null} initialOrganizations={[ref]}
          onClose={() => setAddingContact(0)} onSaved={() => { setAddingContact(0); reload(); }}
          renderSimilarAction={(similar) => (
            <Link href={`/directorio/contactos/${similar.code}`} className="text-sm font-medium text-forest-800 hover:underline">
              Abrir
            </Link>
          )} />
      )}
    </div>
  );
}
