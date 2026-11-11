package pe.edu.pucp.hesperides.modules.reservations.controller;

/** Quién ve y quién mantiene las reservas (SPEC-107 D-08, SPEC-001 Anexo A). */
final class ReservationAccess {

    /** Los cuatro roles leen la agenda: el operario necesita saber qué jardín está prestado. */
    static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')";

    /** Registrar, editar y anular es de coordinación; el capataz y el operario solo leen. */
    static final String MAINTAINERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private ReservationAccess() {
    }
}
