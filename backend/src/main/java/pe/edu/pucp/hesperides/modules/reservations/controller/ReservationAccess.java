package pe.edu.pucp.hesperides.modules.reservations.controller;

/** Quién ve y quién mantiene las reservas (SPEC-107 D-08, SPEC-001 Anexo A). */
final class ReservationAccess {

    /** Los cuatro roles leen la agenda: el operario necesita saber qué jardín está prestado. */
    static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')";

    /** Registrar, editar y anular es de coordinación; el capataz y el operario solo leen. */
    static final String MAINTAINERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    /**
     * Marcar que el espacio está en uso también es del capataz, que es quien ve
     * el jardín (enmienda del 11 nov 2026); el operario solo lee.
     */
    static final String USAGE_RECORDERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";

    private ReservationAccess() {
    }
}
