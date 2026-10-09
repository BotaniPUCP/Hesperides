package pe.edu.pucp.hesperides.shared.exception;

/**
 * Otra operación exclusiva está en curso y esta no puede esperar (409). No es un
 * error del pedido: repetirlo en unos minutos funciona.
 */
public class OperationInProgressException extends RuntimeException {

    public OperationInProgressException(String message) {
        super(message);
    }
}
