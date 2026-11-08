'use client';

import { Modal } from '@/components/ui';
import { OrganizationForm, type OrganizationFormProps } from './OrganizationForm';

/** El formulario de organización dentro de un diálogo, para registrar sin dejar otro formulario. */
export function OrganizationFormModal(props: OrganizationFormProps) {
  return (
    <Modal isOpen onClose={props.onClose} title={props.organization ? 'Editar organización' : 'Registrar organización'}>
      <OrganizationForm {...props} />
    </Modal>
  );
}
