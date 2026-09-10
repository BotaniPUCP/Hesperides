'use client';

import { useEffect, useState } from 'react';
import type { CreateUserPayload, UpdateUserPayload, UserDetail } from '@shared/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { ASSIGNABLE_ROLES } from '@/lib/constants';
import { validateUserForm } from './userFormValidation';
import type { UserFormErrors, UserFormValues } from './userFormValidation';

export interface UserFormModalProps {
  isOpen: boolean;
  /** null crea, un usuario edita. El mismo formulario para ambos: los campos coinciden. */
  user: UserDetail | null;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>;
}

const ROLE_OPTIONS: SelectOption[] = ASSIGNABLE_ROLES.map((rol, indice) => ({
  id: indice + 1,
  code: rol.value,
  label: rol.label,
}));

const VACIO: UserFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  roleCode: '',
  initialPassword: '',
};

function valoresDe(user: UserDetail | null): UserFormValues {
  if (user === null) return VACIO;
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleCode: user.role.code,
    initialPassword: '',
  };
}

export function UserFormModal({ isOpen, user, onClose, onSubmit }: UserFormModalProps) {
  const esAlta = user === null;
  const [values, setValues] = useState<UserFormValues>(() => valoresDe(user));
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [guardando, setGuardando] = useState(false);

  // Al abrir con otra persona hay que recargar: el modal se monta una vez y se
  // reutiliza, así que sin esto el formulario mostraría los datos del anterior.
  useEffect(() => {
    if (isOpen) {
      setValues(valoresDe(user));
      setErrors({});
    }
  }, [isOpen, user]);

  const campo = (clave: keyof UserFormValues) => (valor: string) => {
    setValues((previos) => ({ ...previos, [clave]: valor }));
  };

  const enviar = async () => {
    const encontrados = validateUserForm(values, esAlta);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const comunes = {
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      roleCode: values.roleCode,
    };

    setGuardando(true);
    try {
      // En edición no se construye ningún campo de contraseña: no es que se
      // envíe vacío, es que no existe (SPEC-100 §2.7).
      await onSubmit(esAlta ? { ...comunes, initialPassword: values.initialPassword } : comunes);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esAlta ? 'Nuevo usuario' : 'Editar usuario'}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={enviar} loading={guardando} disabled={guardando}>
            {esAlta ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          id="user-email"
          label="Correo electrónico"
          type="email"
          value={values.email}
          onChange={campo('email')}
          errorMessage={errors.email}
          required
          maxLength={255}
        />
        <Input
          id="user-first-name"
          label="Nombres"
          value={values.firstName}
          onChange={campo('firstName')}
          errorMessage={errors.firstName}
          required
          maxLength={100}
        />
        <Input
          id="user-last-name"
          label="Apellidos"
          value={values.lastName}
          onChange={campo('lastName')}
          errorMessage={errors.lastName}
          required
          maxLength={100}
        />
        <Select
          id="user-role"
          label="Rol"
          value={values.roleCode === '' ? null : values.roleCode}
          options={ROLE_OPTIONS}
          onChange={(option) => campo('roleCode')(option?.code ?? '')}
          errorMessage={errors.roleCode}
          placeholder="Seleccione un rol"
          required
        />

        {esAlta && (
          <Input
            id="user-initial-password"
            label="Contraseña inicial"
            type="password"
            value={values.initialPassword}
            onChange={campo('initialPassword')}
            errorMessage={errors.initialPassword}
            helperText="Se enviará por correo. La persona deberá cambiarla al entrar."
            required
          />
        )}
      </div>
    </Modal>
  );
}
