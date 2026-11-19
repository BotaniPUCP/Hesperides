package pe.edu.pucp.hesperides.engine.planning;

/**
 * Estado de un conjunto para una actividad (SPEC-203 §5.5). Es el resultado de
 * un cálculo, no un catálogo: cada valor existe porque el Engine sabe derivarlo.
 */
public enum PlanningState {
    OVERDUE,
    DUE,
    IN_PROGRESS,
    SCHEDULED,
    NOT_DUE,
    DONE_FOR_PERIOD,
    NOT_CONFIGURED
}
