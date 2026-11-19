package pe.edu.pucp.hesperides.modules.planning.attendance;

import java.util.Collection;
import java.util.List;

/**
 * Lo que la planificación necesita de las intervenciones. Se declara aquí y lo
 * implementa el módulo de intervenciones: la planificación no depende de él.
 */
public interface GardenAttendanceProvider {

    /** Ubicaciones COMPLETED o VALIDATED de la actividad en esas secciones (o en lugares sobre ellas). */
    List<GardenCompletion> completions(long activityTypeItemId, Collection<Long> zoneIds);

    List<OpenWork> openWorks(long activityTypeItemId, Collection<Long> zoneIds);
}
