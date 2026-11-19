package pe.edu.pucp.hesperides.engine.incidents;

import java.time.Duration;
import java.time.Instant;

/** El plazo corre desde la recepción hasta el cierre (SPEC-201 §3.9). */
public final class IncidentDeadline {

    /** «Por vencer» es el último cuarto del plazo. */
    private static final int DUE_SOON_DIVISOR = 4;

    private IncidentDeadline() {
    }

    public static Instant dueAt(Instant receivedAt, Duration allowed) {
        return receivedAt.plus(allowed);
    }

    public static DeadlineStatus status(Instant receivedAt, Duration allowed, Instant now) {
        Instant due = dueAt(receivedAt, allowed);
        if (now.isAfter(due)) return DeadlineStatus.OVERDUE;
        Duration remaining = Duration.between(now, due);
        return remaining.compareTo(allowed.dividedBy(DUE_SOON_DIVISOR)) <= 0
                ? DeadlineStatus.DUE_SOON : DeadlineStatus.ON_TIME;
    }

    public static boolean met(Instant receivedAt, Duration allowed, Instant closedAt) {
        return !closedAt.isAfter(dueAt(receivedAt, allowed));
    }
}
