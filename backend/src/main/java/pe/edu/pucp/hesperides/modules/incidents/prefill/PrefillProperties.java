package pe.edu.pucp.hesperides.modules.incidents.prefill;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Proveedor del agente de prellenado; la clave vive solo en el entorno (`OLLAMA_API_KEY`). */
@ConfigurationProperties("hesperides.incidents.prefill")
public record PrefillProperties(String baseUrl, String model, String apiKey, int timeoutSeconds) {

    public boolean configured() {
        return apiKey != null && !apiKey.isBlank() && baseUrl != null && !baseUrl.isBlank();
    }
}
