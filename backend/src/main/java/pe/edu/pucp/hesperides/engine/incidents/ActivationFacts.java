package pe.edu.pucp.hesperides.engine.incidents;

/** Lo que la regla de activación necesita saber de una incidencia, sin depender de JPA. */
public record ActivationFacts(
        boolean hasType,
        boolean hasUrgency,
        boolean hasLocation,
        boolean thirdParty,
        Integer agreedDays,
        boolean hasProvider,
        HeightClass height) {
}
