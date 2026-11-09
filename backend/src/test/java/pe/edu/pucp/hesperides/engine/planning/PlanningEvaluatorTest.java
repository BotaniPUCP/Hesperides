package pe.edu.pucp.hesperides.engine.planning;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.engine.frequency.SeasonalInterval;
import pe.edu.pucp.hesperides.engine.planning.GardenHistory.GardenDate;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-203 §5.5: el estado de un conjunto para una actividad. Sin base de datos. */
class PlanningEvaluatorTest {

    private static final LocalDate HOY = LocalDate.of(2026, 11, 8);
    private static final List<SeasonalInterval> ESTACIONES = List.of(
            new SeasonalInterval("VERANO", 1, 3, 20, 25),
            new SeasonalInterval("PRIMAVERA", 10, 12, 30, 35));

    private static FrequencyRule intervalo() {
        return new FrequencyRule(1L, "INTERVAL_DAYS", 40, 45, null, null, null, null, ESTACIONES,
                LocalDate.of(2020, 1, 1), null);
    }

    private static FrequencyRule ciclo(int dias) {
        return new FrequencyRule(2L, "COVERAGE_CYCLE", null, null, null, dias, null, null, List.of(),
                LocalDate.of(2020, 1, 1), null);
    }

    private static FrequencyRule cuota(int veces) {
        return new FrequencyRule(3L, "SEASONAL_PERIOD", null, null, veces, null, null, null, List.of(),
                LocalDate.of(2020, 1, 1), null);
    }

    private static FrequencyRule ventana(int desde, int hasta) {
        return new FrequencyRule(4L, "ANNUAL_WINDOW", null, null, 1, null, desde, hasta, List.of(),
                LocalDate.of(2020, 1, 1), null);
    }

    private static long work = 100;

    private static GardenHistory jardin(long zone, LocalDate... dates) {
        return new GardenHistory(zone, java.util.Arrays.stream(dates).map(d -> new GardenDate(work++, d)).toList());
    }

    private static PlanningVerdict evaluar(FrequencyRule rule, List<GardenHistory> jardines, LocalDate hoy) {
        return PlanningEvaluator.evaluate(rule, jardines, List.of(), hoy);
    }

    private static PlanningVerdict conUltimaVez(LocalDate ref) {
        return evaluar(intervalo(), List.of(jardin(1, ref)), HOY);
    }

    @Nested
    class Intervalo {

        @Test
        void unDiaAntesDelMinimoAunNoToca() {
            var v = conUltimaVez(HOY.minusDays(29));
            assertThat(v.state()).isEqualTo(PlanningState.NOT_DUE);
            assertThat(v.days()).isEqualTo(1);
            assertThat(v.suggestedDate()).isEqualTo(HOY.plusDays(1));
        }

        @Test
        void enElMinimoToca() {
            var v = conUltimaVez(HOY.minusDays(30));
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isEqualTo(5);
            assertThat(v.suggestedDate()).isEqualTo(HOY);
        }

        @Test
        void enElMaximoVenceHoy() {
            var v = conUltimaVez(HOY.minusDays(35));
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isZero();
        }

        @Test
        void unDiaDespuesDelMaximoEstaAtrasada() {
            var v = conUltimaVez(HOY.minusDays(36));
            assertThat(v.state()).isEqualTo(PlanningState.OVERDUE);
            assertThat(v.days()).isEqualTo(1);
        }

        @Test
        void mandaElJardinAtendidoHaceMasTiempo() {
            var v = evaluar(intervalo(), List.of(
                    jardin(1, LocalDate.of(2026, 10, 1)),
                    jardin(2, LocalDate.of(2026, 10, 20))), HOY);
            assertThat(v.lastDate()).isEqualTo(LocalDate.of(2026, 10, 1));
            assertThat(v.daysSinceLast()).isEqualTo(38);
            assertThat(v.state()).isEqualTo(PlanningState.OVERDUE);
            assertThat(v.days()).isEqualTo(3);
            assertThat(v.rhythm().minDays()).isEqualTo(30);
            assertThat(v.rhythm().seasonLabel()).isEqualTo("Primavera");
        }

        @Test
        void unJardinSinRegistroTocaSinDias() {
            var v = evaluar(intervalo(), List.of(jardin(1, HOY.minusDays(3)), jardin(2)), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isNull();
            assertThat(v.neverAttendedCount()).isEqualTo(1);
        }

        @Test
        void laEstacionEsLaDeLaUltimaVezNoLaDeHoy() {
            // Último corte el 20 de marzo (verano, 20-25); hoy 12 de abril.
            var v = evaluar(intervalo(), List.of(jardin(1, LocalDate.of(2026, 3, 20))), LocalDate.of(2026, 4, 12));
            assertThat(v.rhythm().minDays()).isEqualTo(20);
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isEqualTo(2);
        }

        @Test
        void elCicloDeCoberturaUsaSusDiasComoMinimoYMaximo() {
            var v = evaluar(ciclo(15), List.of(jardin(1, HOY.minusDays(15))), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isZero();
            assertThat(evaluar(ciclo(15), List.of(jardin(1, HOY.minusDays(14))), HOY).state())
                    .isEqualTo(PlanningState.NOT_DUE);
        }
    }

    @Nested
    class Cuota {

        @Test
        void vanTresDeCuatroYLaProximaSeEstima() {
            var v = evaluar(cuota(4), List.of(jardin(1, LocalDate.of(2026, 2, 15), LocalDate.of(2026, 5, 15),
                    LocalDate.of(2026, 8, 15))), HOY);
            assertThat(v.yearCount()).isEqualTo(3);
            assertThat(v.estimatedDate()).isEqualTo(LocalDate.of(2026, 11, 14));
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.suggestedDate()).isEqualTo(LocalDate.of(2026, 11, 14));
        }

        @Test
        void sinNadaEnElAnoLaEstimadaCabeAntesDeFinDeAno() {
            var v = evaluar(cuota(4), List.of(jardin(1, LocalDate.of(2025, 12, 20))), LocalDate.of(2026, 11, 1));
            assertThat(v.yearCount()).isZero();
            assertThat(v.estimatedDate()).isBetween(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31));
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
        }

        @Test
        void conLaCuotaCumplidaNoFaltaNada() {
            var v = evaluar(cuota(2), List.of(jardin(1, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 9, 1))), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.DONE_FOR_PERIOD);
        }

        @Test
        void laCuotaNuncaSaleAtrasada() {
            var v = evaluar(cuota(12), List.of(jardin(1, LocalDate.of(2026, 1, 5))), HOY);
            assertThat(v.state()).isNotEqualTo(PlanningState.OVERDUE);
        }

        @Test
        void alCambiarDeAnoSeCuentaElAnoNuevo() {
            var v = evaluar(cuota(4), List.of(jardin(1, LocalDate.of(2026, 12, 20))), LocalDate.of(2027, 1, 2));
            assertThat(v.yearCount()).isZero();
            assertThat(v.state()).isEqualTo(PlanningState.NOT_DUE);
            assertThat(v.estimatedDate()).isEqualTo(LocalDate.of(2027, 3, 21));
        }

        @Test
        void unAnoBisiestoNoRompeLaEstimada() {
            var v = evaluar(cuota(4), List.of(jardin(1, LocalDate.of(2028, 2, 29))), LocalDate.of(2028, 3, 1));
            assertThat(v.estimatedDate()).isEqualTo(LocalDate.of(2028, 5, 30));
        }
    }

    @Nested
    class Ventana {

        @Test
        void dentroDeLaVentanaSinAtenderToca() {
            var v = evaluar(ventana(12, 1), List.of(jardin(1, LocalDate.of(2025, 12, 10))), LocalDate.of(2027, 1, 15));
            assertThat(v.state()).isEqualTo(PlanningState.DUE);
            assertThat(v.days()).isEqualTo(16);
        }

        @Test
        void laVentanaCerradaSinCompletarEstaAtrasada() {
            var v = evaluar(ventana(12, 1), List.of(jardin(1, LocalDate.of(2025, 12, 10))), LocalDate.of(2027, 2, 1));
            assertThat(v.state()).isEqualTo(PlanningState.OVERDUE);
            assertThat(v.days()).isEqualTo(1);
        }

        @Test
        void todosAtendidosEnLaVentanaEstaCumplido() {
            var v = evaluar(ventana(12, 1), List.of(jardin(1, LocalDate.of(2026, 12, 5)), jardin(2, LocalDate.of(2027, 1, 3))),
                    LocalDate.of(2027, 1, 10));
            assertThat(v.state()).isEqualTo(PlanningState.DONE_FOR_PERIOD);
        }

        @Test
        void conLaVentanaAnteriorCompletaAunNoToca() {
            var v = evaluar(ventana(12, 1), List.of(jardin(1, LocalDate.of(2025, 12, 12))), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.NOT_DUE);
            assertThat(v.days()).isEqualTo(23);
            assertThat(v.suggestedDate()).isEqualTo(LocalDate.of(2026, 12, 1));
        }
    }

    @Nested
    class Abiertas {

        @Test
        void sinEmpezarEstaProgramada() {
            var open = new OpenRound(81, "INT-000081", LocalDate.of(2026, 11, 12), null, Set.of(1L));
            var v = PlanningEvaluator.evaluate(intervalo(), List.of(jardin(1, HOY.minusDays(40))), List.of(open), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.SCHEDULED);
            assertThat(v.openRound().code()).isEqualTo("INT-000081");
        }

        @Test
        void empezadaEstaEnCursoYCuentaSoloJardinesDelConjunto() {
            var inicio = LocalDate.of(2026, 11, 5);
            var open = new OpenRound(81, "INT-000081", inicio, inicio, Set.of(1L, 2L, 99L));
            var v = PlanningEvaluator.evaluate(intervalo(), List.of(
                    jardin(1, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 6)),
                    jardin(2, LocalDate.of(2026, 10, 1)),
                    jardin(3, LocalDate.of(2026, 10, 1))), List.of(open), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.IN_PROGRESS);
            assertThat(v.progress()).isEqualTo(new Progress(1, 3));
            assertThat(v.days()).isEqualTo(2);
        }

        @Test
        void conDosAbiertasMandaLaProgramadaAntes() {
            var tarde = new OpenRound(90, "INT-000090", LocalDate.of(2026, 11, 20), null, Set.of(1L));
            var pronto = new OpenRound(81, "INT-000081", LocalDate.of(2026, 11, 12), null, Set.of(1L));
            var v = PlanningEvaluator.evaluate(intervalo(), List.of(jardin(1, HOY.minusDays(40))), List.of(tarde, pronto), HOY);
            assertThat(v.openRound().interventionId()).isEqualTo(81);
        }

        @Test
        void unaAbiertaSoloDeJardinesAjenosNoCuenta() {
            var ajena = new OpenRound(81, "INT-000081", HOY, HOY, Set.of(99L));
            var v = PlanningEvaluator.evaluate(intervalo(), List.of(jardin(1, HOY.minusDays(50))), List.of(ajena), HOY);
            assertThat(v.state()).isEqualTo(PlanningState.OVERDUE);
        }
    }

    @Test
    void sinReglaNoEstaConfigurada() {
        assertThat(evaluar(null, List.of(jardin(1, HOY)), HOY).state()).isEqualTo(PlanningState.NOT_CONFIGURED);
    }
}
