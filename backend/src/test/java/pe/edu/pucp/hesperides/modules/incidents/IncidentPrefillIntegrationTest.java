package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ReviewIncidentRequest;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillAgent.PrefillRequest;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * SPEC-201 §3.4 y aceptación 1-3. Sin @Transactional: el prellenado corre en sus propias
 * transacciones, como en producción. El disparador automático se apaga para controlar cuándo corre.
 */
@SpringBootTest(properties = "hesperides.incidents.prefill.auto-run=false") @Testcontainers
class IncidentPrefillIntegrationTest extends IncidentTestSupport {

    @Autowired IncidentPrefillService prefill;

    private AgentSuggestion suggestion(boolean imminent) {
        return new AgentSuggestion("Rama rajada sobre el Pontódromo", "BRANCH_AT_RISK", anyZoneId(), "Frente a Letras",
                false, HeightClass.OVER_5M, imminent, imminent ? "Puede caer sobre peatones" : null,
                "1. Acordonar", "Por «rama» y «rajada»", 0.82);
    }

    @Test
    void fillsTheEmptyFieldsAndKeepsTheSuggestionForReview() {
        when(agent.suggest(any())).thenReturn(suggestion(true));
        long id = reportAs(foreman).incident().id();

        prefill.run(id);

        var detail = current(id);
        assertThat(detail.prefill().status()).isEqualTo("READY");
        assertThat(detail.incident().title()).isEqualTo("Rama rajada sobre el Pontódromo");
        assertThat(detail.incident().type().code()).isEqualTo("BRANCH_AT_RISK");
        assertThat(detail.incident().heightClass()).isEqualTo("OVER_5M");
        assertThat(detail.prefill().suggestedUrgencyCode()).isEqualTo("HIGH");
        assertThat(detail.prefill().suggestsThirdParty()).isTrue();
        assertThat(detail.incident().urgency().code()).as("la gravedad del capataz no se sobrescribe").isEqualTo("MEDIUM");
    }

    @Test
    void neverOverwritesWhatAPersonEdited() {
        when(agent.suggest(any())).thenReturn(suggestion(false));
        var sent = reportAs(foreman);
        var i = sent.incident();
        review.update(i.id(), new ReviewIncidentRequest(i.version(), "Título de coordinación", i.description(), "MEDIUM",
                "PEST", null, null, null, null, null, false, null, null, null, null, i.requestedBy().name(),
                null, null, null, null), coordinator);

        prefill.run(i.id());

        var incident = current(i.id()).incident();
        assertThat(incident.title()).isEqualTo("Título de coordinación");
        assertThat(incident.type().code()).isEqualTo("PEST");
        assertThat(incident.locationReference()).isEqualTo("Frente a Letras");
    }

    @Test
    void theAgentOnlyReceivesTextSeverityAndLocation() {
        when(agent.suggest(any())).thenReturn(suggestion(false));
        long id = reportAs(foreman).incident().id();

        prefill.run(id);

        var sent = ArgumentCaptor.forClass(PrefillRequest.class);
        verify(agent).suggest(sent.capture());
        assertThat(sent.getValue().description()).isEqualTo("Rama rajada sobre el Pontódromo");
        assertThat(sent.getValue().reportedUrgencyCode()).isEqualTo("MEDIUM");
        assertThat(sent.getValue().toString()).doesNotContain(foreman).doesNotContain("Persona Prueba")
                .doesNotContain("Áreas verdes");
    }

    @Test
    void aFailingAgentLeavesTheReportSavedAndTheRetryAvailable() {
        when(agent.suggest(any())).thenThrow(new IllegalStateException("Gemini caído"));
        long id = reportAs(foreman).incident().id();

        prefill.run(id);

        var detail = current(id);
        assertThat(detail.prefill().status()).isEqualTo("FAILED");
        assertThat(detail.incident().originalDescription()).isEqualTo("Rama rajada sobre el Pontódromo");
        assertThat(review.retryPrefill(id, coordinator).prefill().status()).isEqualTo("PENDING");
    }

    @Test
    void unknownTypesAndSectionsFromTheModelAreDiscarded() {
        when(agent.suggest(any())).thenReturn(new AgentSuggestion("Algo", "INVENTED", 999_999_999L, null, false,
                HeightClass.NOT_APPLICABLE, false, null, null, null, 0.4));
        long id = reportAs(foreman).incident().id();

        prefill.run(id);

        var detail = current(id);
        assertThat(detail.incident().type()).isNull();
        assertThat(detail.incident().zone()).isNull();
        assertThat(detail.prefill().warnings()).containsExactly("LOW_CONFIDENCE");
    }

    @Test
    void runningTwiceDoesNotCallTheAgentAgain() {
        when(agent.suggest(any())).thenReturn(suggestion(false));
        long id = reportAs(foreman).incident().id();

        prefill.run(id);
        prefill.run(id);

        verify(agent, times(1)).suggest(any());
    }
}
