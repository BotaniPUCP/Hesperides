package pe.edu.pucp.hesperides.engine.reservations;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Reglas puras de una reserva: estado, cruce de horarios y días locales
 * (SPEC-107 §8). Sin Spring, sin base de datos y sin reloj propio: el instante
 * de referencia se recibe para que las pruebas sean deterministas.
 */
public final class ReservationPeriod {

    /** Una reserva no puede durar más de siete días (SPEC-107 §3.2). */
    public static final Duration MAX_DURATION = Duration.ofDays(7);

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

    public static boolean withinMaximumDuration(Instant start, Instant end) {
        return !Duration.between(start, end).minus(MAX_DURATION).isPositive();
    }

    /** El primer día local que toca la reserva. */
    public static LocalDate firstDay(Instant start, ZoneId zone) {
        return start.atZone(zone).toLocalDate();
    }

    /**
     * El último día local que toca la reserva. Se resta un nanosegundo porque el
     * fin es exclusivo: una reserva que termina a las 00:00 no trabaja el día
     * siguiente. Una que termina a la 01:00 sí, y cuenta como dos días.
     */
    public static LocalDate lastDay(Instant start, Instant end, ZoneId zone) {
        Instant lastMoment = end.equals(start) ? start : end.minusNanos(1);
        return lastMoment.atZone(zone).toLocalDate();
    }

    /** Cuántos días locales abarca; una reserva de 23:00 a 01:00 son dos. */
    public static long localDayCount(Instant start, Instant end, ZoneId zone) {
        return ChronoUnit.DAYS.between(firstDay(start, zone), lastDay(start, end, zone)) + 1;
    }
}
