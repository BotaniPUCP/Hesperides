package pe.edu.pucp.hesperides.engine.reservations;

import java.time.Instant;

/**
 * Reglas puras del seguimiento del uso de una reserva (SPEC-107, enmienda del
 * 11 nov 2026): la confirmación del solicitante y la marca de uso del
 * encargado. Sin Spring ni reloj propio: el instante de referencia se recibe
 * para que las pruebas sean deterministas.
 */
public final class ReservationFollowup {

    private ReservationFollowup() {
    }

    /**
     * El corte compartido por las dos marcas: minutos antes del fin de la
     * reserva (parámetro RESERVATION_CONFIRMATION_MINUTES, 20 por defecto).
     * Pasado el corte ya no se confirma el uso ni se marca el espacio, porque
     * dentro de esos minutos ya no sirve para decidir nada (D-12).
     */
    public static Instant lateCutoff(Instant end, int minutes) {
        return end.minusSeconds(minutes * 60L);
    }

    /**
     * Confirmar o desconfirmar vale desde que existe la reserva hasta el corte.
     * Una anulada o terminada tampoco, y eso lo cubre el chequeo de estado.
     */
    public static boolean canConfirm(ReservationState state, Instant end, Instant now, int minutes) {
        return state == ReservationState.UPCOMING || state == ReservationState.IN_PROGRESS
                ? now.isBefore(lateCutoff(end, minutes))
                : false;
    }

    /**
     * Marcar o desmarcar el uso vale dentro del horario, y hasta el corte: un
     * «está siendo usado» en los últimos minutos ya no se puede comprobar
     * (D-12). La falta no se marca — termina sin marca y se muestra «No usada»
     * —, así que una Próxima o Terminada no se toca. Una reserva más corta que
     * la tolerancia no tiene ventana: su corte cae antes del inicio.
     */
    public static boolean canRecordUsage(Instant start, Instant end, Instant cancelledAt, Instant now,
            int minutes) {
        return ReservationPeriod.state(start, end, cancelledAt, now) == ReservationState.IN_PROGRESS
                && now.isBefore(lateCutoff(end, minutes));
    }

    /** Lo que ve el usuario: las marcas guardadas más el reloj. */
    public static ReservationUsage usageDisplay(ReservationState state, boolean spaceUsed) {
        return switch (state) {
            case UPCOMING -> ReservationUsage.NOT_RECORDED;
            case IN_PROGRESS -> spaceUsed ? ReservationUsage.IN_USE : ReservationUsage.NOT_IN_USE;
            case FINISHED -> spaceUsed ? ReservationUsage.USED : ReservationUsage.NOT_USED;
            case CANCELLED -> ReservationUsage.NOT_RECORDED;
        };
    }
}
