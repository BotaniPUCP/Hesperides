package pe.edu.pucp.hesperides.engine.incidents;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Reglas que se aplican siempre a lo que propone el agente, venga del modelo que venga
 * (SPEC-201 §3.4), y cómo se mezcla la sugerencia con lo que ya escribió una persona.
 */
public final class IncidentPrefill {

    /** Por debajo de esta confianza se pide revisión cuidadosa. */
    public static final double CONFIDENCE_THRESHOLD = 0.7;
    private static final String HIGH_URGENCY = "HIGH";

    private IncidentPrefill() {
    }

    public static PrefillAdvice advise(AgentSuggestion suggestion) {
        String urgency = suggestion.imminentRisk() ? HIGH_URGENCY : null;
        boolean thirdParty = suggestion.thirdParty() || suggestion.height() == HeightClass.OVER_5M;
        var warnings = new ArrayList<PrefillWarning>();
        if (suggestion.height() == HeightClass.UNCLASSIFIED) warnings.add(PrefillWarning.VERIFY_HEIGHT);
        if (suggestion.confidence() < CONFIDENCE_THRESHOLD) warnings.add(PrefillWarning.LOW_CONFIDENCE);
        return new PrefillAdvice(urgency, thirdParty, java.util.List.copyOf(warnings));
    }

    /**
     * Devuelve solo los campos que la sugerencia puede llenar: los vacíos que nadie editó.
     * Nunca sobrescribe un valor puesto por una persona, tampoco al reintentar.
     */
    public static Map<String, Object> fill(Map<String, Object> current, Set<String> editedByPerson,
                                           Map<String, Object> suggested) {
        var result = new LinkedHashMap<String, Object>();
        suggested.forEach((field, value) -> {
            if (value != null && current.get(field) == null && !editedByPerson.contains(field)) result.put(field, value);
        });
        return result;
    }
}
