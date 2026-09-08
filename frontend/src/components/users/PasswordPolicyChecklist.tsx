'use client';

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

export interface PasswordPolicyContext {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordPolicyResult {
  minLength: boolean;
  mixedCase: boolean;
  hasDigit: boolean;
  notPersonal: boolean;
  valid: boolean;
}

/** Plegado insensible a mayúsculas y tildes, equivalente al fold del backend. */
export function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Evalúa la política de SPEC-100 §9.1 en el cliente para el indicador en
 * vivo. Es solo UX: la autoridad es el backend, que la revalida al persistir.
 */
export function evaluatePassword(password: string, context: PasswordPolicyContext): PasswordPolicyResult {
  const minLength = password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
  const mixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  const folded = fold(password);
  const personal = [context.email, context.firstName, context.lastName]
    .filter((part): part is string => Boolean(part))
    .map(fold)
    .filter((part) => part.length >= 3)
    .some((part) => folded.includes(part));

  return {
    minLength,
    mixedCase,
    hasDigit,
    notPersonal: !personal,
    valid: minLength && mixedCase && hasDigit && !personal,
  };
}

export interface PasswordPolicyChecklistProps {
  value: string;
  context: PasswordPolicyContext;
}

export function PasswordPolicyChecklist({ value, context }: PasswordPolicyChecklistProps) {
  const result = evaluatePassword(value, context);
  const items: Array<{ label: string; met: boolean }> = [
    { label: 'Al menos 10 caracteres', met: result.minLength },
    { label: 'Letras mayúsculas y minúsculas', met: result.mixedCase },
    { label: 'Al menos un dígito', met: result.hasDigit },
    { label: 'No coincide con correo ni nombre', met: result.notPersonal },
  ];

  return (
    <ul className="flex flex-col gap-1" aria-label="Requisitos de la contraseña">
      {items.map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-2 text-xs ${item.met ? 'text-green-700' : 'text-slate-500'}`}
        >
          {item.met ? (
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300" />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}