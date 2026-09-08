package pe.edu.pucp.hesperides.modules.users.service;

/**
 * El envío de credenciales falló (SPEC-100 §5.3): SMTP inalcanzable, credenciales
 * inválidas, timeout o el servidor rechazó al destinatario. El mensaje técnico
 * viaja al audit_log (USER_CREDENTIALS_DELIVERY_FAILED), nunca la contraseña.
 */
public class CredentialDeliveryException extends RuntimeException {

    public CredentialDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}