package pe.edu.pucp.hesperides.engine.frequency;

/**
 * Veredicto de una evaluacion de cumplimiento.
 *
 * <p>No es un catalogo configurable y eso es deliberado: INV-2 prohibe los enum
 * para tipos y estados <em>de dominio que el usuario administra</em>, y esto no
 * lo administra nadie. Es el resultado de un calculo, y cada valor existe porque
 * el Engine sabe derivarlo. Una fila nueva en una tabla no produciria un
 * veredicto nuevo, solo una opcion que ningun evaluador devuelve.
 */
public enum ComplianceStatus {

    /** Se ejecuto dentro del objetivo. */
    ON_TARGET,

    /** Se excedio el objetivo pero sin pasar el limite aceptable. */
    WITHIN_TOLERANCE,

    /** Se paso del limite: es un mantenimiento vencido. */
    OVERDUE,

    /**
     * La regla no admite veredicto con los datos disponibles. Distinto de
     * OVERDUE: un intervalo necesita dos ejecuciones para medirse, y una sola
     * no es un incumplimiento, es una medicion imposible. Tambien es el
     * veredicto de ON_DEMAND, que por naturaleza no tiene nada que cumplir.
     */
    NOT_APPLICABLE,

    /**
     * Nadie configuro una frecuencia para esta actividad. Un pendiente de
     * configuracion, nunca una falta operativa: reportarlo como OVERDUE
     * acusaria al equipo de campo de algo que no hizo.
     */
    NOT_CONFIGURED
}
