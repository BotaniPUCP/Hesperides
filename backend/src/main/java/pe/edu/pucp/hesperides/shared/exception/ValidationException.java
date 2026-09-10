package pe.edu.pucp.hesperides.shared.exception;

/**
 * Un input no cumple una regla de formato. Distinta de BusinessRuleException,
 * que es para reglas del dominio: esta mapea a 400 (el cliente envió algo mal
 * formado) y aquella a 422 (el dato es válido pero la operación no procede).
 */
public class ValidationException extends RuntimeException {

    public ValidationException(String message) {
        super(message);
    }
}
