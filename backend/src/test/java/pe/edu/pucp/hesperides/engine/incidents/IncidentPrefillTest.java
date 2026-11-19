package pe.edu.pucp.hesperides.engine.incidents;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static pe.edu.pucp.hesperides.engine.incidents.PrefillWarning.*;

class IncidentPrefillTest {

    private static AgentSuggestion suggestion(boolean imminent, HeightClass height, boolean thirdParty, double confidence) {
        return new AgentSuggestion("Rama rajada", "BRANCH_AT_RISK", null, null, thirdParty, height,
                imminent, imminent ? "puede caer" : null, "1. Acordonar", "Por la palabra rama", confidence);
    }

    @Test
    void imminentRiskSuggestsHighUrgencyWithoutTouchingTheReporterSeverity() {
        var advice = IncidentPrefill.advise(suggestion(true, HeightClass.UNDER_5M, false, 0.9));
        assertThat(advice.suggestedUrgencyCode()).isEqualTo("HIGH");
    }

    @Test
    void withoutImminentRiskThereIsNoUrgencySuggestion() {
        assertThat(IncidentPrefill.advise(suggestion(false, HeightClass.UNDER_5M, false, 0.9)).suggestedUrgencyCode()).isNull();
    }

    @Test
    void tallTreeForcesThirdPartySuggestionEvenIfTheModelSaidOwnStaff() {
        assertThat(IncidentPrefill.advise(suggestion(false, HeightClass.OVER_5M, false, 0.9)).thirdParty()).isTrue();
    }

    @Test
    void unclassifiedTreeAsksToVerifyHeightAndLowConfidenceAsksForCarefulReview() {
        var advice = IncidentPrefill.advise(suggestion(false, HeightClass.UNCLASSIFIED, false, 0.69));
        assertThat(advice.warnings()).containsExactly(VERIFY_HEIGHT, LOW_CONFIDENCE);
    }

    @Test
    void confidenceAtTheThresholdHasNoWarning() {
        assertThat(IncidentPrefill.advise(suggestion(false, HeightClass.UNDER_5M, false, 0.7)).warnings()).isEmpty();
    }

    @Test
    void confidenceOutsideZeroToOneIsRejected() {
        assertThatThrownBy(() -> suggestion(false, HeightClass.UNDER_5M, false, 1.2))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fillsOnlyEmptyFieldsThatNobodyEdited() {
        var current = new HashMap<String, Object>();
        current.put("title", null);
        current.put("typeCode", "PLAGUE");
        current.put("reference", null);
        var suggested = Map.<String, Object>of("title", "Rama rajada", "typeCode", "BRANCH_AT_RISK", "reference", "Frente a Letras");

        var fill = IncidentPrefill.fill(current, Set.of("reference"), suggested);

        assertThat(fill).containsExactly(Map.entry("title", "Rama rajada"));
    }

    @Test
    void codeHasYearAndFourDigitsAndGrowsBeyondThem() {
        assertThat(IncidentCode.format(2026, 41)).isEqualTo("INC-2026-0041");
        assertThat(IncidentCode.format(2026, 12345)).isEqualTo("INC-2026-12345");
        assertThatThrownBy(() -> IncidentCode.format(2026, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
