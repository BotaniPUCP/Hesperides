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

class OllamaPrefillAgentTest {

    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();
    private final AtomicReference<String> receivedAuth = new AtomicReference<>();
    private HttpServer server;

    private static final PrefillRequest REQUEST = new PrefillRequest("Rama rajada en el Pontódromo, pasa mucha gente",
            "MEDIUM", "Frente a Letras", null, List.of(new Choice("42", "Pontódromo")),
            List.of(new Choice("BRANCH_AT_RISK", "Rama en riesgo de caída")));

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    private OllamaPrefillAgent agentAnswering(int status, String body, String apiKey) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/chat", exchange -> {
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            receivedAuth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
        return new OllamaPrefillAgent(new PrefillProperties(url, "gpt-oss:20b", apiKey, 5), mapper);
    }

    private static String chatAnswer(String content) {
        return "{\"message\":{\"role\":\"assistant\",\"content\":" + JsonMapper.builder().build().writeValueAsString(content) + "}}";
    }

    @Test
    void sendsTheKeyAsBearerAndAsksForJson() throws IOException {
        var agent = agentAnswering(200, chatAnswer("{\"title\":\"Rama\",\"confidence\":0.9}"), "secret-key");

        agent.suggest(REQUEST);

        assertThat(receivedAuth.get()).isEqualTo("Bearer secret-key");
        var body = mapper.readTree(receivedBody.get());
        assertThat(body.path("model").asString()).isEqualTo("gpt-oss:20b");
        assertThat(body.path("format").asString()).isEqualTo("json");
        assertThat(body.path("stream").asBoolean(true)).isFalse();
        assertThat(receivedBody.get()).contains("Rama rajada en el Pontódromo").contains("42: Pontódromo");
    }

    @Test
    void parsesTheModelAnswerIntoASuggestion() throws IOException {
        var agent = agentAnswering(200, chatAnswer("""
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
        var agent = agentAnswering(200, chatAnswer(
                "{\"title\":\"Algo\",\"zoneCode\":\"Pontódromo\",\"heightClass\":\"ALTO\",\"confidence\":7}"), "key");

        var s = agent.suggest(REQUEST);

        assertThat(s.zoneId()).isNull();
        assertThat(s.height()).isEqualTo(HeightClass.UNCLASSIFIED);
        assertThat(s.confidence()).isEqualTo(1.0);
        assertThat(s.title()).isEqualTo("Algo");
    }

    @Test
    void anErrorStatusIsAFailure() throws IOException {
        var agent = agentAnswering(401, "{\"error\":\"unauthorized\"}", "bad");
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anAnswerThatIsNotAJsonObjectIsAFailure() throws IOException {
        var agent = agentAnswering(200, chatAnswer("Lo siento, no puedo"), "key");
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void withoutAKeyItFailsBeforeCallingAnybody() {
        var agent = new OllamaPrefillAgent(new PrefillProperties("http://127.0.0.1:9", "m", "", 1), mapper);
        assertThatThrownBy(() -> agent.suggest(REQUEST)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not configured");
    }
}
