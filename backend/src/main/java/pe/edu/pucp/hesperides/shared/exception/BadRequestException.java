package pe.edu.pucp.hesperides.shared.exception;

/**
 * El dato del formulario es válido estructuralmente pero inválido de negocio,
 * y el contrato lo define como 400, no 422 (SPEC-100 "me/password": "Current
 * password is incorrect" responde 400 porque la sesión sí es válida).
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}