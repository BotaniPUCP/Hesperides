'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useCanMaintainDirectory } from '@/hooks/useDirectory';
import { ContactForm } from './ContactForm';
import { OrganizationForm } from './OrganizationForm';

type Kind = 'organizacion' | 'contacto';

const KINDS: { kind: Kind; title: string; description: string }[] = [
  { kind: 'organizacion', title: 'Organización', description: 'Una unidad PUCP o una empresa externa.' },
  { kind: 'contacto', title: 'Contacto', description: 'Una persona de una o más organizaciones.' },
];

const openLink = (href: string) => (
  <Link href={href} className="text-sm font-medium text-forest-800 hover:underline">Abrir</Link>
);

/** Registrar una organización o un contacto, uno a la vez: primero qué, luego sus datos. */
export function RegistroIndividualScreen() {
  const canMaintain = useCanMaintainDirectory();
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);

  if (!canMaintain) {
    return (
      <div className="surface-card">
        <EmptyState title="Registrar en el directorio" description="Solo coordinación registra organizaciones y contactos." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Registro individual" description="Elige qué vas a registrar y completa sus datos." />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Qué registrar</legend>
        {KINDS.map((k) => (
          <label key={k.kind} className={`surface-card flex cursor-pointer items-start gap-3 ${kind === k.kind
            ? 'ring-2 ring-forest-700' : ''}`}>
            <input type="radio" name="kind" className="mt-1" checked={kind === k.kind} onChange={() => setKind(k.kind)} />
            <span>
              <span className="block font-semibold text-neutral-900">{k.title}</span>
              <span className="block text-sm text-neutral-600">{k.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {kind === 'organizacion' && (
        <section className="surface-card" aria-label="Datos de la organización">
          <OrganizationForm key="org" organization={null} onClose={() => setKind(null)}
            onSaved={(saved) => router.push(`/directorio/${saved.code}`)}
            renderSimilarAction={(code) => openLink(`/directorio/${code}`)} />
        </section>
      )}
      {kind === 'contacto' && (
        <section className="surface-card" aria-label="Datos del contacto">
          <ContactForm key="contact" contact={null} onClose={() => setKind(null)}
            onSaved={(saved) => router.push(`/directorio/contactos/${saved.code}`)}
            renderSimilarAction={(similar) => openLink(`/directorio/contactos/${similar.code}`)} />
        </section>
      )}
    </div>
  );
}
