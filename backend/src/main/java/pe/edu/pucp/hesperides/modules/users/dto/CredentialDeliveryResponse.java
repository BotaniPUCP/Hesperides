package pe.edu.pucp.hesperides.modules.users.dto;

import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;

/**
 * Respuesta reducida de resend-credentials: solo lo que el frontend necesita
 * para decidir si avisar de un fallo de entrega. Nunca incluye la contraseña
 * generada, que solo existe en memoria y en el cuerpo del correo.
 */
public record CredentialDeliveryResponse(Long id, String email, CredentialStatus credentialStatus) {
}
