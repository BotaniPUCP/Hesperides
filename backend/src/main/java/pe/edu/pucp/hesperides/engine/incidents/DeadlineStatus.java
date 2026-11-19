package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Estado del plazo de una incidencia abierta, que el mapa pinta de verde, ámbar o rojo.
 *
 * <p>Es un enum de Java porque no es un catálogo configurable: se calcula del reloj y cada
 * valor corresponde a una rama de la regla de §3.9.
 */
public enum DeadlineStatus {
    ON_TIME,
    DUE_SOON,
    OVERDUE
}
