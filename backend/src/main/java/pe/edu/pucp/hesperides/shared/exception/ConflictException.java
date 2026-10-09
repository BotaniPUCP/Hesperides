package pe.edu.pucp.hesperides.shared.exception;

/** La operación choca con el estado actual de otro dato (por ejemplo, borrar algo que otros usan). Mapea a 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
