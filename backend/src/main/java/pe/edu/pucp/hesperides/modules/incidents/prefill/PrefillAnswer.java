package pe.edu.pucp.hesperides.modules.incidents.prefill;

import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Convierte el JSON del modelo en una sugerencia; algo que no es JSON válido es un fallo. */
final class PrefillAnswer {
    private static final int MAX_TITLE = 120;

    private PrefillAnswer() {
    }

    static AgentSuggestion parse(ObjectMapper mapper, String content) {
        JsonNode json = mapper.readTree(content);
        if (json == null || !json.isObject()) throw new IllegalStateException("Model did not answer a JSON object");
        return new AgentSuggestion(truncate(text(json, "title")), text(json, "typeCode"), zoneId(json),
                text(json, "reference"), json.path("thirdParty").asBoolean(false), height(json),
                json.path("imminentRisk").asBoolean(false), text(json, "imminentReason"), text(json, "plan"),
                text(json, "justification"), confidence(json));
    }

    private static String text(JsonNode json, String key) {
        JsonNode node = json.get(key);
        if (node == null || node.isNull()) return null;
        String value = node.asString().trim();
        return value.isEmpty() ? null : value;
    }

    private static Long zoneId(JsonNode json) {
        String code = text(json, "zoneCode");
        if (code == null) return null;
        try {
            return Long.parseLong(code);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Un valor desconocido no es motivo para perder el resto de la sugerencia. */
    private static HeightClass height(JsonNode json) {
        try {
            return HeightClass.fromCode(text(json, "heightClass"));
        } catch (IllegalArgumentException ex) {
            return HeightClass.UNCLASSIFIED;
        }
    }

    private static double confidence(JsonNode json) {
        double value = json.path("confidence").asDouble(0);
        return Double.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }

    private static String truncate(String title) {
        return title == null || title.length() <= MAX_TITLE ? title : title.substring(0, MAX_TITLE);
    }
}
