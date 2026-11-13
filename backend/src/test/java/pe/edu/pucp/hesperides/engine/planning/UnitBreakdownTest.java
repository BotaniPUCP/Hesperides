package pe.edu.pucp.hesperides.engine.planning;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.planning.GardenHistory.GardenDate;
import pe.edu.pucp.hesperides.engine.planning.UnitBreakdown.LastDate;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-203 §5.5: cuánto de un conjunto quedó al día cuando solo se atendió una parte. */
class UnitBreakdownTest {

    private static final LocalDate HOY = LocalDate.of(2026, 11, 12);
    private static long work = 500;

    /** Cada 3 a 4 días, todo el año. */
    private static FrequencyRule riego() {
        return new FrequencyRule(1L, "INTERVAL_DAYS", 3, 4, null, null, null, null, List.of(), LocalDate.of(2020, 1, 1), null);
    }

    private static GardenHistory unidad(long id, LocalDate... dates) {
        return new GardenHistory(id, Arrays.stream(dates).map(d -> new GardenDate(work++, d)).toList());
    }

    @Test
    void dosJardinesRegadosHoyEstanAlDiaYLosOtrosDosFaltan() {
        var b = UnitBreakdown.of(riego(), List.of(unidad(1, HOY), unidad(2, HOY), unidad(3, HOY.minusDays(10)), unidad(4, HOY.minusDays(10))), HOY);

        assertThat(b.upToDate()).isEqualTo(2);
        assertThat(b.pendingUnits()).containsExactly(3L, 4L);
        assertThat(b.lastDates()).containsExactly(new LastDate(HOY, 2), new LastDate(HOY.minusDays(10), 2));
    }

    @Test
    void lasNuncaAtendidasFaltanYVanAlFinalSinFecha() {
        var b = UnitBreakdown.of(riego(), List.of(unidad(1), unidad(-7, HOY.minusDays(1)), unidad(2)), HOY);

        assertThat(b.upToDate()).isEqualTo(1);
        assertThat(b.pendingUnits()).containsExactly(1L, 2L);
        assertThat(b.lastDates()).containsExactly(new LastDate(HOY.minusDays(1), 1), new LastDate(null, 2));
    }

    @Test
    void unaUnidadQueYaLeTocaNoEstaAlDiaAunqueNoEsteAtrasada() {
        // Dentro del rango (día 3 de 3–4): toca, así que falta.
        var b = UnitBreakdown.of(riego(), List.of(unidad(1, HOY.minusDays(3)), unidad(2, HOY.minusDays(1))), HOY);

        assertThat(b.upToDate()).isEqualTo(1);
        assertThat(b.pendingUnits()).containsExactly(1L);
    }

    @Test
    void conCuotaCadaUnidadCuentaSusVecesDelAno() {
        var cuota = new FrequencyRule(3L, "SEASONAL_PERIOD", null, null, 2, null, null, null, List.of(), LocalDate.of(2020, 1, 1), null);
        var cumplida = unidad(1, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 9, 1));
        var conUna = unidad(2, LocalDate.of(2026, 3, 1));

        var b = UnitBreakdown.of(cuota, List.of(cumplida, conUna), HOY);

        assertThat(b.upToDate()).isEqualTo(1);
        assertThat(b.pendingUnits()).containsExactly(2L);
    }

    @Test
    void sinReglaNoHayDesglose() {
        assertThat(UnitBreakdown.of(null, List.of(unidad(1, HOY)), HOY)).isNull();
    }
}
