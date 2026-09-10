import { firstPasswordError } from '@/lib/password-policy';

export interface UserFormValues {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  initialPassword: string;
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

// Deliberadamente laxa: solo descarta lo que es evidentemente inválido. La
// validación real es la del backend (@Email), y una expresión estricta aquí
// rechazaría correos legítimos que el servidor sí acepta.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida lo que se puede saber sin consultar al servidor. No reemplaza la
 * validación del backend: la complementa para no gastar un viaje de red en un
 * error que ya es visible aquí.
 *
 * `requirePassword` es false al editar, porque en ese modo el campo no existe
 * (SPEC-100 §2.7: la contraseña de otra persona no se fija, se regenera).
 */
export function validateUserForm(
  values: UserFormValues,
  requirePassword: boolean,
): UserFormErrors {
  const errors: UserFormErrors = {};

  if (values.email.trim() === '') {
    errors.email = 'El correo es obligatorio';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Debe ser un correo electrónico válido';
  }

  if (values.firstName.trim() === '') errors.firstName = 'Los nombres son obligatorios';
  if (values.lastName.trim() === '') errors.lastName = 'Los apellidos son obligatorios';
  if (values.roleCode === '') errors.roleCode = 'El rol es obligatorio';

  if (requirePassword) {
    if (values.initialPassword === '') {
      errors.initialPassword = 'La contraseña es obligatoria';
    } else {
      // La política entera, no solo la longitud: el backend rechaza con 400 una
      // clave sin mayúscula o sin dígito, y ese viaje de red es evitable. Los
      // datos del titular entran en la comprobación porque una contraseña que
      // contiene su propio correo es de las primeras que prueba quien lo conoce.
      errors.initialPassword = firstPasswordError(values.initialPassword, {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
    }
  }

  // Una clave sin errores deja la propiedad puesta en undefined, y eso haría que
  // `Object.keys(errors).length > 0` bloqueara el envío de un formulario válido.
  if (errors.initialPassword === undefined) delete errors.initialPassword;

  return errors;
}
