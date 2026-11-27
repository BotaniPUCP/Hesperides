package pe.edu.pucp.hesperides.modules.incidents.prefill;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent;
import tools.jackson.databind.JsonNode;
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
 * Agente sobre la API generateContent de Google Gemini, con un único prompt por reporte.
 * Es la cuarta excepción a «sin servicios externos» de SPEC-000: su caída nunca impide reportar.
 */
@Component
@EnableConfigurationProperties(PrefillProperties.class)
public class GeminiPrefillAgent implements IncidentPrefillAgent {
    private static final String MODELS_PATH = "/v1beta/models/";
    private static final String GENERATE = ":generateContent";
    private static final String JSON_MIME = "application/json";
    private static final int HTTP_OK = 200;
    private final PrefillProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public GeminiPrefillAgent(PrefillProperties properties, ObjectMapper mapper) {
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
        return PrefillAnswer.parse(mapper, answerText(response.body()));
    }

    private String body(PrefillRequest request) {
        return mapper.writeValueAsString(Map.of(
                "contents", List.of(Map.of("role", "user",
                        "parts", List.of(Map.of("text", PrefillPrompt.of(request))))),
                "generationConfig", Map.of("responseMimeType", JSON_MIME)));
    }

    /** Sin candidatos (por ejemplo, un bloqueo de seguridad) no hay nada que sugerir. */
    private String answerText(String body) {
        JsonNode part = mapper.readTree(body).path("candidates").path(0).path("content").path("parts").path(0);
        String text = part.path("text").asString("");
        if (text.isBlank()) throw new IllegalStateException("Prefill agent answered without text");
        return text;
    }

    private HttpResponse<String> send(String body) {
        var request = HttpRequest.newBuilder(endpoint())
                .timeout(timeout())
                .header("Content-Type", JSON_MIME)
                .header("x-goog-api-key", properties.apiKey())
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

    private URI endpoint() {
        return URI.create(properties.baseUrl().replaceAll("/+$", "") + MODELS_PATH + properties.model() + GENERATE);
    }

    private Duration timeout() {
        return Duration.ofSeconds(Math.max(1, properties.timeoutSeconds()));
    }
}
