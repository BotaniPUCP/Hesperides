package pe.edu.pucp.hesperides.engine.reservations;

/**
 * El estado de una reserva se calcula, nunca se guarda (SPEC-107 §2.1): una
 * reserva anulada lo está desde que se anula, y las demás cambian de estado con
 * el reloj. Guardarlo obligaría a un proceso que recorra la tabla cada minuto.
 *
 * <p>Es un enum de Java porque no es un catálogo configurable: cada valor
 * corresponde a una rama de {@link ReservationPeriod#state}, igual que los
 * estados calculados de la planificación (SPEC-203 §2.5).
 */
public enum ReservationState {
    UPCOMING,
    IN_PROGRESS,
    FINISHED,
    CANCELLED
}
