package pe.edu.pucp.hesperides.engine.planning;

/** Cada cuánto toca, tal como lo muestra la pantalla; solo se llenan los campos del tipo de regla. */
public record Rhythm(Integer minDays, Integer maxDays, String seasonLabel, Integer annualTarget,
                     Integer windowStartMonth, Integer windowEndMonth) {
}
