package pe.edu.pucp.hesperides.engine.reservations;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/**
 * El texto del aviso de trabajo por hacer en o cerca de un jardín reservado
 * (SPEC-107 D-06). Una intervención que empezó o estaba programada antes del día
 * de la reserva y sigue abierta confunde si solo se nombra: el aviso explica
 * cuánto antes fue y resalta que ese día pueden estar trabajando.
 */
public final class PendingWorkWarning {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("es-PE"));
    private static final int DAYS_PER_WEEK = 7;

    private PendingWorkWarning() {
    }

    /**
     * @param where      el jardín donde está el trabajo
     * @param activity   la actividad con su código, como se muestra al usuario
     * @param meters     distancia al jardín reservado; nula si el trabajo está en él
     * @param workDay    el día en que empezó o, si no empezó, el programado
     * @param started    si ya empezó
     * @param today      el día de hoy en Lima, para decir «hoy»
     */
    public record Work(String where, String activity, Long meters, LocalDate workDay, boolean started,
            LocalDate reservationDay, LocalDate today) {
        boolean here() {
            return meters == null;
        }
    }

    /** {@code emphasis} va resaltado después del texto; nulo si no hace falta. */
    public record Wording(String text, String emphasis) {
    }

    public static Wording describe(Work work) {
        String opening = (work.here() ? "" : "A " + work.meters() + " m, ")
                + work.where() + " tiene trabajo por hacer de " + work.activity();
        return work.workDay().isBefore(work.reservationDay()) ? earlier(work, opening) : sameDay(work, opening);
    }

    private static Wording sameDay(Work work, String opening) {
        String when = (work.started() ? "empezó el " : "programada el ") + day(work.workDay());
        String tail = work.here() ? ": pueden estar trabajando durante la reserva" : "";
        return new Wording(opening + ", " + when + tail, null);
    }

    private static Wording earlier(Work work, String opening) {
        String when = (work.started() ? "empezó el " : "estaba programada para el ") + day(work.workDay());
        String gap = gap(ChronoUnit.DAYS.between(work.workDay(), work.reservationDay()));
        String place = work.here() ? "en este jardín" : "allí";
        String text = opening + ": " + when + ", " + gap + " antes de la reserva, y todavía no se marca como terminada "
                + place + ".";
        String thatDay = work.reservationDay().equals(work.today()) ? "Hoy" : "El " + day(work.reservationDay());
        String garden = work.here() ? "en este jardín" : "en ese jardín";
        return new Wording(text, thatDay + " podrían estar trabajando " + garden + ".");
    }

    /** Sin el punto de la abreviatura («19 nov.»): en medio de la frase se lee como un corte. */
    private static String day(LocalDate date) {
        return DAY.format(date).replace(".", "");
    }

    private static String gap(long days) {
        if (days == 1) {
            return "un día";
        }
        if (days % DAYS_PER_WEEK != 0) {
            return days + " días";
        }
        long weeks = days / DAYS_PER_WEEK;
        return weeks == 1 ? "una semana" : weeks + " semanas";
    }
}
