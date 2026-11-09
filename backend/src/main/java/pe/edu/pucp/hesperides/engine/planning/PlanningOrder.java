package pe.edu.pucp.hesperides.engine.planning;

import java.util.Comparator;
import java.util.List;

/**
 * Orden de la lista de planificación (SPEC-203 §5.5): lo más atrasado arriba, lo
 * que toca con menos plazo después, y lo que no exige nada al final.
 */
public final class PlanningOrder {

    private static final List<PlanningState> RANK = List.of(PlanningState.OVERDUE, PlanningState.DUE,
            PlanningState.IN_PROGRESS, PlanningState.SCHEDULED, PlanningState.NOT_DUE,
            PlanningState.DONE_FOR_PERIOD, PlanningState.NOT_CONFIGURED);

    public static final Comparator<PlanningVerdict> COMPARATOR = Comparator
            .comparingInt((PlanningVerdict v) -> RANK.indexOf(v.state()))
            .thenComparingInt(PlanningOrder::urgency);

    private PlanningOrder() {
    }

    /** Atrasadas: más días tarde primero. Las demás: menos días primero; sin días (sin registro) antes que todas. */
    private static int urgency(PlanningVerdict v) {
        if (v.days() == null) {
            return Integer.MIN_VALUE;
        }
        return v.state() == PlanningState.OVERDUE ? -v.days() : v.days();
    }
}
