package pe.edu.pucp.hesperides.modules.incidents.prefill;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Agente sobre la API de chat de Ollama (Ollama Cloud o un Ollama propio, según la URL).
 * Es la cuarta excepción a «sin servicios externos» de SPEC-000: su caída nunca impide reportar.
 */
@Component
@EnableConfigurationProperties(PrefillProperties.class)
public class OllamaPrefillAgent implements IncidentPrefillAgent {
    private static final String CHAT_PATH = "/api/chat";
    private static final int HTTP_OK = 200;
    private final PrefillProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public OllamaPrefillAgent(PrefillProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(timeout()).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override
    public AgentSuggestion suggest(PrefillRequest request) {
        if (!properties.configured()) throw new IllegalStateException("Prefill agent is not configured");
        HttpResponse<String> response = send(body(request));
        if (response.statusCode() != HTTP_OK) {
            throw new IllegalStateException("Prefill agent answered HTTP " + response.statusCode());
        }
        String content = mapper.readTree(response.body()).path("message").path("content").asString("");
        return PrefillAnswer.parse(mapper, content);
    }

    private String body(PrefillRequest request) {
        return mapper.writeValueAsString(Map.of(
                "model", properties.model(),
                "stream", false,
                "format", "json",
                "messages", List.of(
                        Map.of("role", "system", "content", PrefillPrompt.SYSTEM),
                        Map.of("role", "user", "content", PrefillPrompt.user(request)))));
    }

    private HttpResponse<String> send(String body) {
        var request = HttpRequest.newBuilder(URI.create(properties.baseUrl().replaceAll("/+$", "") + CHAT_PATH))
                .timeout(timeout())
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + properties.apiKey())
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException ex) {
            throw new IllegalStateException("Prefill agent unreachable", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Prefill agent call interrupted", ex);
        }
    }

    private Duration timeout() {
        return Duration.ofSeconds(Math.max(1, properties.timeoutSeconds()));
    }
}
