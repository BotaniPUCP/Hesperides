package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.time.LocalDate;

/** Un ejemplar atendido: estaba en una ubicación que el capataz marcó completada (SPEC-203 §5.4). */
public record SpecimenCompletion(long elementId, long interventionId, LocalDate date) {
}
