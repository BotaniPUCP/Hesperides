package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.util.Collection;
import java.util.List;

/**
 * Lo que la planificación necesita saber de los ejemplares. Un ejemplar cuenta
 * solo cuando una intervención lo nombra: atender el jardín donde está no lo da
 * por atendido (SPEC-203 D-14). Lo implementa el módulo de intervenciones.
 */
public interface SpecimenAttendanceProvider {

    /** Ejemplares de ubicaciones COMPLETED o VALIDATED de la actividad. */
    List<SpecimenCompletion> specimenCompletions(long activityTypeItemId, Collection<Long> elementIds);

    List<OpenSpecimenWork> openSpecimenWorks(long activityTypeItemId, Collection<Long> elementIds);
}
