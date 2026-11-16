package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Lo que propone el agente de prellenado (SPEC-201 §3.4), ya validado y traducido a códigos.
 * Es solo una sugerencia: coordinación la revisa al activar.
 */
public record AgentSuggestion(
        String title,
        String typeCode,
        Long zoneId,
        String reference,
        boolean thirdParty,
        HeightClass height,
        boolean imminentRisk,
        String imminentReason,
        String plan,
        String justification,
        double confidence) {

    public AgentSuggestion {
        if (Double.isNaN(confidence) || confidence < 0 || confidence > 1) {
            throw new IllegalArgumentException("Confidence must be between 0 and 1");
        }
        if (height == null) height = HeightClass.NOT_APPLICABLE;
    }
}
