package pe.edu.pucp.hesperides.modules.interventions.repository;

/**
 * Consultas de la planificación preventiva (SPEC-203 §5.4) sobre las ubicaciones
 * de intervención. La sección de una ubicación es su {@code zone_id} o, si se
 * registró sobre un lugar, el {@code zone_id} de ese lugar. Una ubicación sobre un
 * sector no cuenta para sus secciones: no se infiere cobertura.
 */
public final class GardenAttendanceSql {

    private static final String SECTION = "COALESCE(l.zone_id, p.zone_id)";

    private static final String FROM_LOCATIONS = """
            FROM interventions i
            JOIN catalog_items plan ON plan.id = i.planning_status_item_id AND plan.code <> 'CANCELLED'
            JOIN intervention_locations l ON l.intervention_id = i.id AND l.deleted_at IS NULL
            JOIN catalog_items st ON st.id = l.status_item_id
            LEFT JOIN places p ON p.id = l.place_id AND l.zone_id IS NULL
            WHERE i.deleted_at IS NULL AND i.intervention_type_item_id = :activity
              AND\s""" + SECTION + " = ANY(CAST(:zones AS bigint[]))";

    /** Fecha local: {@code completed_at} se guarda como hora de pared UTC. */
    public static final String COMPLETIONS = "SELECT " + SECTION + " AS zone_id, i.id AS work_id, "
            + "CAST((l.completed_at AT TIME ZONE 'UTC') AT TIME ZONE :tz AS date) AS day "
            + FROM_LOCATIONS + " AND st.code IN ('COMPLETED', 'VALIDATED') AND l.completed_at IS NOT NULL";

    /** Una fila por ubicación de un trabajo con algo pendiente en las secciones pedidas. */
    public static final String OPEN_LOCATIONS = "SELECT i.id AS work_id, i.code, i.scheduled_date, " + SECTION
            + " AS zone_id, st.code NOT IN ('COMPLETED', 'VALIDATED') AS pending, "
            + "CAST((l.started_at AT TIME ZONE 'UTC') AT TIME ZONE :tz AS date) AS started "
            + FROM_LOCATIONS + " AND st.code <> 'CANCELLED' AND i.id IN (SELECT i.id " + FROM_LOCATIONS
            + " AND st.code NOT IN ('COMPLETED', 'VALIDATED', 'CANCELLED'))";

    private GardenAttendanceSql() {
    }
}
