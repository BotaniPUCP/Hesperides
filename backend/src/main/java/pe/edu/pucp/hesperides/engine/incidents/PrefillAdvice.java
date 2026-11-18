package pe.edu.pucp.hesperides.engine.incidents;

import java.util.List;

/** Resultado de aplicar las reglas fijas a una sugerencia del agente. */
public record PrefillAdvice(String suggestedUrgencyCode, boolean thirdParty, List<PrefillWarning> warnings) {
}
