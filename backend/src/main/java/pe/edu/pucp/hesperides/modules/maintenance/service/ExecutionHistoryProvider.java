package pe.edu.pucp.hesperides.modules.maintenance.service;

import java.time.LocalDate;
import java.util.List;

/**
 * Calendar history consumed by the frequency evaluator.
 *
 * <p>SPEC-200 now provides the V022 schema and per-location execution. Physical
 * completion is stored in {@code intervention_locations.completed_at}; there
 * is no {@code interventions.executed_at} column. Approval and completion are
 * separate events, and a work is accepted only after all its locations have
 * coordinator approval.
 *
 * <p>Scoped providers supply location facts through the default extension below.
 * Their physical dates must never be flattened into campus-wide compliance.
 */
@FunctionalInterface
public interface ExecutionHistoryProvider {

    /**
     * Execution dates in any order. May include dates before {@code from}:
     * the preceding execution is needed to evaluate continuity. Distinct
     * executions on the same date must not be deduplicated by date alone.
     */
    List<LocalDate> executionDates(Long activityTypeItemId, String regime,
                                   LocalDate from, LocalDate to);

    default boolean supportsLocationHistory() { return false; }

    default List<LocationExecution> locationExecutions(Long activityTypeItemId, String regime,
            LocalDate from, LocalDate to) { return List.of(); }
}
