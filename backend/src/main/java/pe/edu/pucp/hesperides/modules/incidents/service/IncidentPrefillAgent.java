package pe.edu.pucp.hesperides.modules.incidents.service;

import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;

import java.util.List;

/**
 * Agente de IA que prellena una incidencia (SPEC-201 §3.4). Ningún servicio de dominio conoce al
 * proveedor concreto: cambiar de Ollama Cloud a otro es otra implementación de esta interfaz.
 */
public interface IncidentPrefillAgent {

    /** Lanza una excepción si el proveedor falla o responde algo inválido; nunca devuelve nulo. */
    AgentSuggestion suggest(PrefillRequest request);

    /** Lo que el agente puede leer. A propósito no lleva reportante, «Pedido de», contactos ni fotos. */
    record PrefillRequest(String description, String reportedUrgencyCode, String locationReference,
                          String chosenZoneName, List<Choice> zones, List<Choice> types) {
    }

    record Choice(String code, String label) {
    }
}
