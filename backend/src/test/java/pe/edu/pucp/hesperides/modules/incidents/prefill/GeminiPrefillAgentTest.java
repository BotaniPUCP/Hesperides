package pe.edu.pucp.hesperides.modules.incidents.prefill;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.Choice;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.PrefillRequest;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiPrefillAgentTest {

    private static final String MODEL = "gemini-3.5-flash-lite";
    private static final String PATH = "/v1beta/models/" + MODEL + ":generateContent";
    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();
    private final AtomicReference<String> receivedKey = new AtomicReference<>();
    private final AtomicReference<String> receivedPath = new AtomicReference<>();
    private HttpServer server;

    private static final PrefillRequest REQUEST = new PrefillRequest("Rama rajada en el Pontódromo, pasa mucha gente",
            "MEDIUM", "Frente a Letras", null, List.of(new Choice("42", "Pontódromo")),
            List.of(new Choice("BRANCH_AT_RISK", "Rama en riesgo de caída")));

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    private GeminiPrefillAgent agentAnswering(int status, String body, String apiKey) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            receivedPath.set(exchange.getRequestURI().getPath());
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            receivedKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
        return new GeminiPrefillAgent(new PrefillProperties(url, MODEL, apiKey, 5), mapper);
    }

    private static String geminiAnswer(String text) {
        return "{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":"
                + JsonMapper.builder().build().writeValueAsString(text) + "}]}}]}";
    }

    @Test
    void callsTheModelWithTheKeyHeaderAndAsksForJson() throws IOException {
        var agent = agentAnswering(200, geminiAnswer("{\"title\":\"Rama\",\"confidence\":0.9}"), "secret-key");

        agent.suggest(REQUEST);

        assertThat(receivedPath.get()).isEqualTo(PATH);
        assertThat(receivedKey.get()).isEqualTo("secret-key");
        var body = mapper.readTree(receivedBody.get());
        assertThat(body.path("generationConfig").path("responseMimeType").asString()).isEqualTo("application/json");
    }

    @Test
    void sendsInstructionsAndReportTogetherInASinglePrompt() throws IOException {
        var agent = agentAnswering(200, geminiAnswer("{\"title\":\"Rama\",\"confidence\":0.9}"), "key");

        agent.suggest(REQUEST);

        var body = mapper.readTree(receivedBody.get());
        assertThat(body.has("systemInstruction")).isFalse();
        var contents = body.path("contents");
        assertThat(contents.size()).isEqualTo(1);
        var parts = contents.get(0).path("parts");
        assertThat(parts.size()).isEqualTo(1);
        assertThat(parts.get(0).path("text").asString())
                .contains("Responde SIEMPRE y SOLO con un objeto JSON")
                .contains("Reporte: Rama rajada en el Pontódromo")
                .contains("42: Pontódromo")
                .contains("BRANCH_AT_RISK: Rama en riesgo de caída");
    }

    @Test
    void parsesTheModelAnswerIntoASuggestion() throws IOException {
        var agent = agentAnswering(200, geminiAnswer("""
            {"title":"Rama en riesgo","typeCode":"BRANCH_AT_RISK","zoneCode":"42","reference":"Frente a Letras",
             "thirdParty":true,"heightClass":"OVER_5M","imminentRisk":true,"imminentReason":"Pasa mucha gente",
             "plan":"1. Acordonar","justification":"rama rajada","confidence":0.83}
            """), "key");

        var s = agent.suggest(REQUEST);

        assertThat(s.title()).isEqualTo("Rama en riesgo");
        assertThat(s.typeCode()).isEqualTo("BRANCH_AT_RISK");
        assertThat(s.zoneId()).isEqualTo(42L);
        assertThat(s.height()).isEqualTo(HeightClass.OVER_5M);
        assertThat(s.imminentRisk()).isTrue();
        assertThat(s.confidence()).isEqualTo(0.83);
    }

    @Test
    void toleratesOddValuesWithoutLosingTheRestOfTheAnswer() throws IOException {
        var agent = agentAnswering(200, geminiAnswer(
                "{\"title\":\"Algo\",\"zoneCode\":\"Pontódromo\",\"heightClass\":\"ALTO\",\"confidence\":7}"), "key");

        var s = agent.suggest(REQUEST);

        assertThat(s.zoneId()).isNull();
        assertThat(s.height()).isEqualTo(HeightClass.UNCLASSIFIED);
        assertThat(s.confidence()).isEqualTo(1.0);
        assertThat(s.title()).isEqualTo("Algo");
    }

    @Test
    void anErrorStatusIsAFailure() throws IOException {
        var agent = agentAnswering(503, "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\"}}", "key");
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("503");
    }

    @Test
    void anAnswerWithoutCandidatesIsAFailure() throws IOException {
        var agent = agentAnswering(200, "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}", "key");
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anAnswerThatIsNotAJsonObjectIsAFailure() throws IOException {
        var agent = agentAnswering(200, geminiAnswer("Lo siento, no puedo"), "key");
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void withoutAKeyItFailsBeforeCallingAnybody() {
        var agent = new GeminiPrefillAgent(new PrefillProperties("http://127.0.0.1:9", MODEL, "", 1), mapper);
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not configured");
    }
}
