package pe.edu.pucp.hesperides.shared.exception;

import java.util.List;
import java.util.Map;

/**
 * Violación de una regla de negocio que cae sobre un campo del formulario pero
 * que la validación Bean Validation no puede expresar (p. ej. la política de
 * contraseñas de SPEC-100 §9.1). Se responde 400 con la misma forma que
 * MethodArgumentNotValidException: {"errors":[{field,message}]}.
 */
public class FieldValidationException extends RuntimeException {

    private final List<Map<String, String>> errors;

    public FieldValidationException(List<Map<String, String>> errors) {
        super("Validation failed");
        this.errors = errors;
    }

    public List<Map<String, String>> getErrors() {
        return errors;
    }
}