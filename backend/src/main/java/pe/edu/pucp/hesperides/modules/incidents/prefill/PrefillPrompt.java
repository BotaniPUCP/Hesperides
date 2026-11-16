package pe.edu.pucp.hesperides.modules.incidents.prefill;

import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.Choice;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.PrefillRequest;

import java.util.List;
import java.util.stream.Collectors;

/** Instrucciones del agente de incidencias de áreas verdes y el mensaje de cada reporte. */
final class PrefillPrompt {
    private PrefillPrompt() {
    }

    static final String SYSTEM = """
        Eres el asistente de la sección de áreas verdes de un campus universitario. Recibes reportes que
        escriben los capataces con sus palabras sobre problemas en jardines, árboles y riego.

        Responde SIEMPRE y SOLO con un objeto JSON con estas claves:
        "title": nombre corto de la incidencia, máximo 8 palabras;
        "typeCode": uno de los códigos de tipo de la lista, o null si ninguno encaja;
        "zoneCode": uno de los códigos de sección de la lista, solo si el texto la nombra; si no, null;
        "reference": cómo reconocer el lugar en campo (edificio, vía, punto), o null;
        "thirdParty": true si el trabajo supera al personal propio (por ejemplo un árbol de 5 m o más);
        "heightClass": "UNDER_5M", "OVER_5M", "UNCLASSIFIED" (es un árbol pero no se sabe) o "NOT_APPLICABLE";
        "imminentRisk": true si algo puede caer sobre personas o bloquea el paso;
        "imminentReason": por qué, o null;
        "plan": pasos de atención numerados, en una sola cadena;
        "justification": por qué clasificaste así;
        "confidence": número entre 0 y 1.

        Reglas: nunca deduzcas la altura de la especie; nunca inventes fechas ni proveedores, solo sugiere.
        """;

    static String user(PrefillRequest request) {
        return """
            Reporte: %s
            Gravedad marcada por el capataz: %s
            Referencia escrita: %s
            Sección elegida: %s

            Tipos (código: nombre):
            %s

            Secciones (código: nombre):
            %s
            """.formatted(request.description(), orDash(request.reportedUrgencyCode()),
                orDash(request.locationReference()), orDash(request.chosenZoneName()),
                lines(request.types()), lines(request.zones()));
    }

    private static String lines(List<Choice> choices) {
        return choices.stream().map(c -> c.code() + ": " + c.label()).collect(Collectors.joining("\n"));
    }

    private static String orDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
