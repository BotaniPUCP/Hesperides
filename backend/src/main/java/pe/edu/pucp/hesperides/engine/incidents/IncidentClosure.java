package pe.edu.pucp.hesperides.engine.incidents;

import java.util.ArrayList;
import java.util.List;

/**
 * Una incidencia se cierra solo con trabajo validado (SPEC-201 §3.8). Una intervención cancelada
 * nunca llegará a validarse, así que bloquea hasta que coordinación quite su vínculo.
 */
public final class IncidentClosure {

    private static final String VALIDATED = "VALIDATED";
    private static final String CANCELLED = "CANCELLED";

    private IncidentClosure() {
    }

    public static List<ClosureBlocker> blockers(boolean active, List<String> linkedStatusCodes) {
        var result = new ArrayList<ClosureBlocker>();
        if (!active) result.add(ClosureBlocker.NOT_ACTIVE);
        if (linkedStatusCodes.isEmpty()) result.add(ClosureBlocker.NO_LINKED_WORK);
        if (linkedStatusCodes.stream().anyMatch(IncidentClosure::pending)) result.add(ClosureBlocker.WORK_NOT_VALIDATED);
        if (linkedStatusCodes.contains(CANCELLED)) result.add(ClosureBlocker.CANCELLED_WORK);
        return List.copyOf(result);
    }

    private static boolean pending(String code) {
        return !VALIDATED.equals(code) && !CANCELLED.equals(code);
    }
}
