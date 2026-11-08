'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ContactDetail } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { useCanMaintainDirectory, useContact } from '@/hooks/useDirectory';
import { directoryApi } from '@/lib/directory-api';
import { ContactFormModal } from './ContactFormModal';
import { DeactivateAction } from './DeactivateAction';
import { DetailFrame, DetailHeader, Field, InactiveBadge } from './DetailParts';

/** Ficha de un contacto: sus datos y sus organizaciones; ahí se edita y se da de baja (SPEC-106 §7). */
export function ContactDetailScreen({ code }: { code: string }) {
  const { contact, loading, errorMessage, notFound, reload } = useContact(code);
  return (
    <DetailFrame loading={loading} notFound={notFound} errorMessage={errorMessage}>
      {() => <ContactView contact={contact as ContactDetail} reload={reload} />}
    </DetailFrame>
  );
}

function ContactView({ contact, reload }: { contact: ContactDetail; reload: () => void }) {
  const canChange = useCanMaintainDirectory() && contact.active;
  const router = useRouter();
  const [editing, setEditing] = useState(0);

  return (
    <div className="space-y-6">
      <DetailHeader title={contact.fullName} badge={!contact.active && <InactiveBadge label="Dado de baja" />}
        description={contact.code}
        actions={canChange && (<>
          <Button variant="secondary" onClick={() => setEditing((n) => n + 1)}>Editar</Button>
          <DeactivateAction title={`Dar de baja a ${contact.fullName}`}
            deactivate={() => directoryApi.deactivateContact(contact.code)}
            onDone={() => router.push('/directorio?tab=contactos')}>
            Dejará de aparecer para elegirlo en los formularios. Lo que ya lo usaba lo sigue mostrando.
          </DeactivateAction>
        </>)} />
      {contact.active && !contact.hasActiveOrganization && (
        <p role="status" className="rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          Sin organización vigente: sus organizaciones se dieron de baja. Asígnale otra o dalo de baja.
        </p>
      )}
      <Card title="Datos">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Anexo">{contact.extension}</Field>
          <Field label="Celular">{contact.mobile}</Field>
          <Field label="Correo">{contact.email}</Field>
        </dl>
      </Card>
      <Card title="Organizaciones">
        <ul className="space-y-1">
          {contact.organizations.map((o) => (
            <li key={o.code} className="flex items-center gap-2">
              <Link href={`/directorio/${o.code}`} className="text-forest-800 hover:underline">{o.name}</Link>
              {!o.active && <InactiveBadge label="Dada de baja" />}
            </li>
          ))}
        </ul>
      </Card>
      {editing > 0 && (
        <ContactFormModal key={editing} contact={contact} onClose={() => setEditing(0)}
          onSaved={() => { setEditing(0); reload(); }} />
      )}
    </div>
  );
}
