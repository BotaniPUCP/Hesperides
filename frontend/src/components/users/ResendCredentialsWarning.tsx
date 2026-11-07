import type { UserDetail } from '@shared/types';

/**
 * La advertencia es obligatoria: el reenvío cambia la contraseña de otra persona
 * en el acto. Si el correo no llega, esa persona se queda fuera del sistema (§5.4).
 */
export function ResendCredentialsWarning({ user }: { user: UserDetail }) {
  return (
    <>
      <p>
        ¿Reenviar las credenciales de <strong>{user.fullName}</strong>? Al confirmar:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Se generará una contraseña temporal nueva y la anterior dejará de funcionar de inmediato.</li>
        <li>Se cerrarán sus sesiones abiertas.</li>
        <li>
          La contraseña temporal se enviará a <strong>{user.email}</strong>. Si el correo no llega, no
          podrá ingresar.
        </li>
        <li>Deberá cambiarla al ingresar; hasta entonces no podrá usar el sistema.</li>
      </ul>
    </>
  );
}
