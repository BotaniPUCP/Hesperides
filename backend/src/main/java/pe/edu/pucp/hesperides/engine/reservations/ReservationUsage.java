package pe.edu.pucp.hesperides.engine.reservations;

/**
 * El uso del espacio de una reserva, derivado y no guardado: las marcas sí se
 * guardan ({@code use_confirmed} y {@code space_used}), pero lo que ve el
 * usuario se calcula con el reloj (SPEC-107, enmienda del 11 nov 2026).
 *
 * <p>Es un enum de Java porque cada valor corresponde a una rama de
 * {@link ReservationFollowup#usageDisplay}, igual que {@link ReservationState}.
 */
public enum ReservationUsage {
    /** Aún no empieza: no se sabe, y no se pregunta. */
    NOT_RECORDED,
    /** En su horario y marcada por el encargado: el espacio está siendo usado. */
    IN_USE,
    /** En su horario sin marca: el caso automático del jardín vacío. */
    NOT_IN_USE,
    /** Terminó con marca: se usó. */
    USED,
    /** Terminó sin marca: la falta queda registrada sola, nadie la anota. */
    NOT_USED
}
