package pe.edu.pucp.hesperides.engine.planning;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-203 D-08 y §5.6: qué regla rige a un jardín y cuándo es «atendido hace poco». */
class EffectiveRuleTest {

    private static final LocalDate HOY = LocalDate.of(2026, 11, 8);

    private static FrequencyRule intervalo(long id, int min, int max) {
        return new FrequencyRule(id, "INTERVAL_DAYS", min, max, null, null, null, null, List.of(),
                LocalDate.of(2020, 1, 1), null);
    }

    private static final FrequencyRule CUOTA = new FrequencyRule(9L, "SEASONAL_PERIOD", null, null, 4, null,
            null, null, List.of(), LocalDate.of(2020, 1, 1), null);

    @Test
    void entreDosPropiasMandaLaMasFrecuente() {
        var rule = EffectiveRule.forGarden(List.of(intervalo(1, 30, 35), intervalo(2, 20, 25)), intervalo(3, 40, 45), HOY);
        assertThat(rule.configId()).isEqualTo(2L);
    }

    @Test
    void sinPropiasRigeLaGeneral() {
        assertThat(EffectiveRule.forGarden(List.of(), intervalo(3, 40, 45), HOY).configId()).isEqualTo(3L);
    }

    @Test
    void sinNingunaReglaNoHayRegla() {
        assertThat(EffectiveRule.forGarden(List.of(), null, HOY)).isNull();
    }

    @Test
    void atendidoAntesDelMinimoEsReciente() {
        assertThat(EffectiveRule.recentMinDays(intervalo(1, 30, 35), HOY.minusDays(3), HOY)).isEqualTo(OptionalInt.of(30));
    }

    @Test
    void enElMinimoYaNoEsReciente() {
        assertThat(EffectiveRule.recentMinDays(intervalo(1, 30, 35), HOY.minusDays(30), HOY)).isEmpty();
    }

    @Test
    void laCuotaNuncaAvisa() {
        assertThat(EffectiveRule.recentMinDays(CUOTA, HOY.minusDays(1), HOY)).isEmpty();
    }
}
