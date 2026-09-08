package pe.edu.pucp.hesperides.shared.exception;

/** Demasiados intentos de login fallidos en la ventana configurada. */
public class TooManyAttemptsException extends RuntimeException {

    public TooManyAttemptsException(String message) {
        super(message);
    }
}