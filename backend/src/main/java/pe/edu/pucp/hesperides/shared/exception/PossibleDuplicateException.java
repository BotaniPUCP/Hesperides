package pe.edu.pucp.hesperides.shared.exception;

import lombok.Getter;

/**
 * Lo que se registra podría ser algo ya registrado. No es un error del dato:
 * quien registra decide, así que la respuesta (409) lleva con qué coincide
 * para que pueda confirmarlo.
 */
@Getter
public class PossibleDuplicateException extends RuntimeException {

    public record Match(String duplicateOf, double distanceM) {
    }

    private final transient Match match;

    public PossibleDuplicateException(String duplicateOf, double distanceM) {
        super("Possible duplicate of " + duplicateOf);
        this.match = new Match(duplicateOf, Math.round(distanceM * 100) / 100.0);
    }
}
