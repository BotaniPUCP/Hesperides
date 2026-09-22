package pe.edu.pucp.hesperides.modules.maintenance.service;

import java.time.LocalDate;
import java.util.List;

/**
 * De donde salen las fechas en que una actividad se ejecuto de verdad.
 *
 * <p>Existe como interfaz porque la tabla {@code interventions} <strong>todavia
 * no esta migrada</strong>: es propiedad del modulo de registro de
 * intervenciones, que aun no se ha escrito. Sin esta abstraccion habria dos
 * malas salidas: dejar el endpoint de cumplimiento fuera hasta entonces, o
 * cablear una consulta a una tabla inexistente.
 *
 * <p>Cuando ese modulo llegue, implementa esta interfaz leyendo
 * {@code interventions.executed_at} y el Engine empieza a evaluar datos reales
 * sin que cambie una linea suya. Eso es lo que compra tener la logica pura.
 */
@FunctionalInterface
public interface ExecutionHistoryProvider {

    /**
     * Fechas de ejecucion de una actividad, en cualquier orden.
     *
     * <p>Puede incluir fechas anteriores a {@code from}: la ultima ejecucion
     * previa al periodo es la que dice si hoy hay un mantenimiento vencido, y
     * recortarla produciria falsos NOT_APPLICABLE.
     */
    List<LocalDate> executionDates(Long activityTypeItemId, String regime,
                                   LocalDate from, LocalDate to);
}
