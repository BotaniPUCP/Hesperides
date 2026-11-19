package pe.edu.pucp.hesperides.engine.reservations;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Reglas puras de una reserva: estado, cruce de horarios y su día
 * (SPEC-107 §8). Sin Spring, sin base de datos y sin reloj propio: el instante
 * de referencia se recibe para que las pruebas sean deterministas.
 */
public final class ReservationPeriod {

    private ReservationPeriod() {
    }

    /**
     * El fin es exclusivo: una reserva de 10:00 a 14:00 y otra de 14:00 a 16:00
     * no se cruzan, porque no comparten ningún instante de uso del jardín.
     */
    public static boolean overlaps(Instant firstStart, Instant firstEnd, Instant secondStart, Instant secondEnd) {
        return firstStart.isBefore(secondEnd) && secondStart.isBefore(firstEnd);
    }

    public static ReservationState state(Instant start, Instant end, Instant cancelledAt, Instant now) {
        if (cancelledAt != null) {
            return ReservationState.CANCELLED;
        }
        if (now.isBefore(start)) {
            return ReservationState.UPCOMING;
        }
        if (now.isBefore(end)) {
            return ReservationState.IN_PROGRESS;
        }
        return ReservationState.FINISHED;
    }

    /** El día local de la reserva. */
    public static LocalDate day(Instant start, ZoneId zone) {
        return start.atZone(zone).toLocalDate();
    }

    /**
     * Una reserva va de una hora a otra del mismo día (SPEC-107 D-01). Se resta un
     * nanosegundo porque el fin es exclusivo: terminar a las 00:00 no toca el día siguiente.
     */
    public static boolean withinOneDay(Instant start, Instant end, ZoneId zone) {
        return end.isAfter(start) && day(start, zone).equals(day(end.minusNanos(1), zone));
    }
}
