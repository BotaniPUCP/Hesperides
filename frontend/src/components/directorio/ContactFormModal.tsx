'use client';

import { Modal } from '@/components/ui';
import { ContactForm, type ContactFormProps } from './ContactForm';

export type { ContactPick } from './ContactForm';

/** El formulario de contacto dentro de un diálogo, para registrar sin dejar otro formulario. */
export function ContactFormModal(props: ContactFormProps) {
  return (
    <Modal isOpen onClose={props.onClose} title={props.contact ? 'Editar contacto' : 'Registrar contacto'}>
      <ContactForm {...props} />
    </Modal>
  );
}
