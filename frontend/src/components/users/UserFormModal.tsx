'use client';

import { useState } from 'react';
import type { CreateUserPayload, UpdateUserPayload, UserDetail } from '@shared/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { erroresDeCampo, mensajeDeApiError } from '@/lib/api-errors';
import { ASSIGNABLE_ROLES } from '@/lib/constants';
import { PasswordPolicyChecklist } from './PasswordPolicyChecklist';
import { validateUserForm } from './userFormValidation';
import type { UserFormErrors, UserFormValues } from './userFormValidation';

export interface UserFormModalProps {
  isOpen: boolean;
  /**
   * null crea, un usuario edita. El mismo formulario para ambos: los campos
   * coinciden.
   *
   * El formulario toma estos datos solo al montarse. Para que cada apertura
   * empiece limpia, quien lo usa le pasa una `key` distinta en cada apertura
   * (ver UsersAdminScreen): remontar es la forma de React de reiniciar estado,
   * y evita el efecto que lo copiaba en cada render.
   */
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

/** Campos que este formulario sabe pintar. Un `field` del backend fuera de esta lista iría a un campo inexistente y se perdería. */
const CAMPOS: (keyof UserFormValues)[] = [
  'email',
  'firstName',
  'lastName',
  'roleCode',
  'initialPassword',
];

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
  const [formError, setFormError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  const campo = (clave: keyof UserFormValues) => (valor: string) => {
    setValues((previos) => ({ ...previos, [clave]: valor }));
  };

  /**
   * El fallo del servidor se pinta donde está la causa y el modal no se cierra:
   * cerrarlo obligaría a reescribir los cuatro campos correctos para arreglar
   * el único que no lo estaba (SPEC-100 §5.4, SPEC-C02 §6).
   */
  const aplicarFalloDelServidor = (error: unknown) => {
    const porCampo = erroresDeCampo(error);
    if (porCampo.length > 0) {
      const encontrados: UserFormErrors = {};
      for (const { field, message } of porCampo) {
        if (CAMPOS.includes(field as keyof UserFormValues)) {
          encontrados[field as keyof UserFormValues] = message;
        }
      }
      // Un 400 cuyos campos no reconocemos no puede quedar en silencio.
      if (Object.keys(encontrados).length > 0) {
        setErrors(encontrados);
        return;
      }
    }

    // El 409 siempre es el correo: es la única columna con índice único
    // (idx_users_email_active de V002).
    if (error instanceof ApiError && error.status === 409) {
      setErrors({ email: mensajeDeApiError(error) });
      return;
    }

    setFormError(mensajeDeApiError(error));
  };

  const enviar = async () => {
    setFormError(undefined);
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
    } catch (error) {
      aplicarFalloDelServidor(error);
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
          <div className="flex flex-col gap-2">
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
            {/* El indicador en vivo evita el viaje de ida y vuelta al backend
                para descubrir qué le faltaba a la contraseña (§5.1). */}
            <PasswordPolicyChecklist
              password={values.initialPassword}
              owner={{
                email: values.email.trim(),
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
              }}
            />
          </div>
        )}

        {/* Un fallo sin campo culpable (422, 500, red) pertenece al formulario
            entero: se queda a la vista hasta el siguiente intento, no como un
            toast que desaparece detrás del modal. */}
        {formError && (
          <p
            role="alert"
            className="rounded-md bg-urgency-critical-bg px-3 py-2 text-sm text-action-danger"
          >
            {formError}
          </p>
        )}
      </div>
    </Modal>
  );
}
