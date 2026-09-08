'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { ApiError } from '@/lib/api';
import type { CreateUserInput, UpdateUserInput, UserRow } from '@/lib/users';
import { PASSWORD_MAX } from './PasswordPolicyChecklist';
import { PasswordPolicyChecklist, evaluatePassword } from './PasswordPolicyChecklist';

type Payload = CreateUserInput | UpdateUserInput;

interface FieldErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleCode?: string;
  initialPassword?: string;
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  user: UserRow | null;
  roles: SelectOption[];
  rolesLoading: boolean;
  onSubmit: (payload: Payload) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserFormModal({
  isOpen,
  onClose,
  mode,
  user,
  roles,
  rolesLoading,
  onSubmit,
}: UserFormModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  // Al abrir el modal se inicializan los campos desde los props (patrón
  // "ajustar estado durante el render"). Al cerrar/reabrir para otro usuario,
  // el transito change prevOpen garantiza el reinicio. Los errores de
  // validación NO disparan cambios de isOpen, así que los datos tecleados
  // (p. ej. tras un 409) se conservan.
  if (isOpen && prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    setEmail(user?.email ?? '');
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setRoleCode(user?.role.code ?? '');
    setInitialPassword('');
    setErrors({});
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (email.trim() === '') next.email = 'El correo es requerido';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Debe ser un correo electrónico válido';
    if (firstName.trim() === '') next.firstName = 'El nombre es requerido';
    if (lastName.trim() === '') next.lastName = 'El apellido es requerido';
    if (roleCode === '') next.roleCode = 'El rol es requerido';
    if (mode === 'create') {
      if (initialPassword === '') {
        next.initialPassword = 'La contraseña inicial es requerida';
      } else if (!evaluatePassword(initialPassword, { email, firstName, lastName }).valid) {
        next.initialPassword = 'La contraseña no cumple la política';
      }
    }
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: Payload =
      mode === 'create'
        ? {
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            roleCode,
            initialPassword,
          }
        : {
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            roleCode,
          };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapFieldErrors(error);
        if (mapped) {
          setErrors(mapped);
          return;
        }
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapFieldErrors = (error: ApiError): FieldErrors | null => {
    if (error.status === 409) return { email: 'Este correo ya está registrado' };
    if (error.status === 400 && Array.isArray((error.data as { errors?: unknown })?.errors)) {
      const serverErrors = (error.data as { errors: Array<{ field: string; message: string }> }).errors;
      const next: FieldErrors = {};
      for (const item of serverErrors) {
        if (item.field === 'email') next.email = item.message;
        if (item.field === 'firstName') next.firstName = item.message;
        if (item.field === 'lastName') next.lastName = item.message;
        if (item.field === 'roleCode') next.roleCode = item.message;
        if (item.field === 'initialPassword') next.initialPassword = item.message;
      }
      return Object.keys(next).length > 0 ? next : null;
    }
    return null;
  };

  const hideSubmit = isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting} type="submit">
            {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Input
          id="user-email"
          label="Correo institucional"
          type="email"
          value={email}
          onChange={setEmail}
          required
          errorMessage={errors.email}
          disabled={isSubmitting}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="user-first-name"
            label="Nombre"
            value={firstName}
            onChange={setFirstName}
            required
            errorMessage={errors.firstName}
            disabled={isSubmitting}
          />
          <Input
            id="user-last-name"
            label="Apellido"
            value={lastName}
            onChange={setLastName}
            required
            errorMessage={errors.lastName}
            disabled={isSubmitting}
          />
        </div>
        <Select
          id="user-role"
          label="Rol"
          value={roleCode === '' ? null : roleCode}
          options={roles}
          onChange={(option) => setRoleCode(option?.code ?? '')}
          loading={rolesLoading}
          required
          errorMessage={errors.roleCode}
          disabled={isSubmitting}
        />
        {mode === 'create' ? (
          <div className="flex flex-col gap-2">
            <Input
              id="user-initial-password"
              label="Contraseña inicial"
              type="password"
              value={initialPassword}
              onChange={setInitialPassword}
              required
              maxLength={PASSWORD_MAX}
              errorMessage={errors.initialPassword}
              disabled={isSubmitting}
            />
            <PasswordPolicyChecklist value={initialPassword} context={{ email, firstName, lastName }} />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            La contraseña no se cambia desde aquí: usa «Reenviar credenciales» o
            «Cambiar la propia contraseña».
          </p>
        )}
      </form>
    </Modal>
  );
}