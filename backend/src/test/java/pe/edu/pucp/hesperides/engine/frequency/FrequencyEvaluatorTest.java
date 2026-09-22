package pe.edu.pucp.hesperides.engine.frequency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * El Engine se prueba entero sin base de datos ni contexto de Spring: esa es la
 * ventaja de que sea puro, y la razon de que estos casos sean baratos de correr.
 */
class FrequencyEvaluatorTest {

    private static final LocalDate DESDE = LocalDate.of(2026, 1, 1);
    private static final LocalDate HASTA = LocalDate.of(2026, 12, 31);

    private static FrequencyRule intervalo(Integer target, Integer min, Integer max,
                                           List<SeasonalInterval> seasons) {
        return new FrequencyRule(1L, "INTERVAL_DAYS", target, min, max, null, null,
                null, null, seasons, LocalDate.of(2020, 1, 1), null);
    }

    private static FrequencyRule cuotaAnual(int cuota, Integer mesIni, Integer mesFin, String tipo) {
        return new FrequencyRule(2L, tipo, null, null, null, cuota, null,
                mesIni, mesFin, List.of(), LocalDate.of(2020, 1, 1), null);
    }

    @Nested
    @DisplayName("Intervalo entre ejecuciones")
    class Intervalos {

        @Test
        @DisplayName("dentro del objetivo da ON_TARGET")
        void dentroDelObjetivo() {
            // Cesped: objetivo 30, limite 45. Dos cortes separados 30 dias.
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1)),
                    DESDE, LocalDate.of(2026, 12, 1));

            assertThat(r.status()).isEqualTo(ComplianceStatus.ON_TARGET);
            assertThat(r.observedValue()).isEqualTo(30);
            assertThat(r.evaluatedWithConfigId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("pasado el objetivo pero bajo el limite da WITHIN_TOLERANCE")
        void dentroDeTolerancia() {
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 10, 18), LocalDate.of(2026, 12, 1)),
                    DESDE, LocalDate.of(2026, 12, 1));

            assertThat(r.status()).isEqualTo(ComplianceStatus.WITHIN_TOLERANCE);
            assertThat(r.observedValue()).isEqualTo(44);
        }

        @Test
        @DisplayName("pasado el limite da OVERDUE")
        void pasadoElLimite() {
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 10, 16), LocalDate.of(2026, 12, 1)),
                    DESDE, LocalDate.of(2026, 12, 1));

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.observedValue()).isEqualTo(46);
        }

        @Test
        @DisplayName("una sola ejecucion reciente da NOT_APPLICABLE, nunca OVERDUE")
        void unaSolaEjecucion() {
            // Un intervalo necesita dos puntos. Acusar de incumplimiento por un
            // dato que no existe seria culpar al equipo del vacio del sistema.
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 11, 20)),
                    DESDE, LocalDate.of(2026, 12, 1));

            assertThat(r.status()).isEqualTo(ComplianceStatus.NOT_APPLICABLE);
            assertThat(r.lastExecutionDate()).isEqualTo(LocalDate.of(2026, 11, 20));
        }

        @Test
        @DisplayName("una sola ejecucion vieja si da OVERDUE")
        void unaSolaEjecucionVieja() {
            // Aqui si hay evidencia de incumplimiento: paso mas tiempo que el
            // limite desde la unica ejecucion conocida.
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 1, 15)),
                    DESDE, LocalDate.of(2026, 12, 1));

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
        }

        @Test
        @DisplayName("sin ninguna ejecucion da NOT_APPLICABLE")
        void sinEjecuciones() {
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla, List.of(), DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.NOT_APPLICABLE);
            assertThat(r.lastExecutionDate()).isNull();
        }

        @Test
        @DisplayName("dejar de ejecutar cuenta aunque el ultimo intervalo fuera bueno")
        void abandonoTrasIntervaloBueno() {
            // Dos cortes perfectos en enero y luego nada en todo el ano. Mirar
            // solo el ultimo intervalo diria ON_TARGET y escondería el abandono.
            var regla = intervalo(30, 30, 45, List.of());
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)),
                    DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.explanation()).contains("ultima ejecucion");
        }
    }

    @Nested
    @DisplayName("Estacionalidad")
    class Estaciones {

        private static final List<SeasonalInterval> VERANO_E_INVIERNO = List.of(
                new SeasonalInterval("VERANO", 1, 3, 30, 35, 21),
                new SeasonalInterval("INVIERNO", 7, 9, 40, 45, 21));

        @Test
        @DisplayName("en verano rige el intervalo corto")
        void enVerano() {
            var regla = intervalo(30, 30, 60, VERANO_E_INVIERNO);
            // 36 dias en verano: pasa el limite de 35 aunque cabria en el general.
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 1, 20), LocalDate.of(2026, 2, 25)),
                    DESDE, LocalDate.of(2026, 2, 25));

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.season()).isEqualTo("VERANO");
        }

        @Test
        @DisplayName("el mismo intervalo en invierno si cumple")
        void enInvierno() {
            // Lo que el resumen de texto no podia hacer: 43 dias es aceptable en
            // invierno y no en verano, y el veredicto lo refleja.
            var regla = intervalo(30, 30, 60, VERANO_E_INVIERNO);
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 7, 15), LocalDate.of(2026, 8, 27)),
                    DESDE, LocalDate.of(2026, 8, 27));

            assertThat(r.status()).isEqualTo(ComplianceStatus.WITHIN_TOLERANCE);
            assertThat(r.season()).isEqualTo("INVIERNO");
        }

        @Test
        @DisplayName("fuera de toda estacion rige el intervalo general")
        void fueraDeEstacion() {
            var regla = intervalo(30, 30, 60, VERANO_E_INVIERNO);
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 6, 15)),
                    DESDE, LocalDate.of(2026, 6, 15));

            assertThat(r.season()).isNull();
            assertThat(r.status()).isEqualTo(ComplianceStatus.WITHIN_TOLERANCE);
        }

        @Test
        @DisplayName("una estacion que cruza el fin de ano no queda vacia")
        void estacionQueCruzaElAno() {
            // El error clasico: comparar con un between deja diciembre-enero sin
            // cubrir ningun mes.
            var ventana = new SeasonalInterval("VERANO_LARGO", 12, 2, 30, 35, null);

            assertThat(ventana.cubre(12)).isTrue();
            assertThat(ventana.cubre(1)).isTrue();
            assertThat(ventana.cubre(2)).isTrue();
            assertThat(ventana.cubre(6)).isFalse();
        }
    }

    @Nested
    @DisplayName("Cuota anual")
    class CuotaAnual {

        @Test
        @DisplayName("cumplir la cuota del ano da ON_TARGET")
        void cuotaCumplida() {
            // Fitosanitario: minimo 4 al ano.
            var regla = cuotaAnual(4, null, null, "SEASONAL_PERIOD");
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 5, 1),
                            LocalDate.of(2026, 8, 1), LocalDate.of(2026, 11, 1)),
                    DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.ON_TARGET);
            assertThat(r.observedValue()).isEqualTo(4);
        }

        @Test
        @DisplayName("quedarse corto da OVERDUE")
        void cuotaIncumplida() {
            var regla = cuotaAnual(4, null, null, "SEASONAL_PERIOD");
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 5, 1),
                            LocalDate.of(2026, 8, 1)),
                    DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.observedValue()).isEqualTo(3);
        }

        @Test
        @DisplayName("un trimestre prorratea la cuota en vez de darla por incumplida")
        void prorrateo() {
            // Sin prorrateo, todo trimestre saldria incumplido contra una cuota
            // anual de 4, que es justo lo que no queremos reportar.
            var regla = cuotaAnual(4, null, null, "SEASONAL_PERIOD");
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 2, 1)),
                    LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31));

            assertThat(r.status()).isEqualTo(ComplianceStatus.ON_TARGET);
            assertThat(r.prorated()).isTrue();
            assertThat(r.expectedValue()).isEqualTo(1);
            assertThat(r.explanation()).contains("prorrateado");
        }

        @Test
        @DisplayName("un trimestre sin ninguna ejecucion si da OVERDUE")
        void trimestreVacio() {
            var regla = cuotaAnual(4, null, null, "SEASONAL_PERIOD");
            var r = FrequencyEvaluator.evaluate(regla, List.of(),
                    LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31));

            assertThat(r.status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.observedValue()).isZero();
        }

        @Test
        @DisplayName("una ejecucion fuera de la ventana cuenta pero se marca")
        void fueraDeVentana() {
            // Poda mayor: 1 al ano, ventana diciembre-enero. Hecha en julio se
            // hizo, pero no en el cierre del campus.
            var regla = cuotaAnual(1, 12, 1, "ANNUAL_WINDOW");
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 7, 15)), DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.ON_TARGET);
            assertThat(r.outOfSeason()).isEqualTo(1);
            assertThat(r.explanation()).contains("fuera de la ventana");
        }

        @Test
        @DisplayName("dentro de la ventana no se marca nada")
        void dentroDeVentana() {
            var regla = cuotaAnual(1, 12, 1, "ANNUAL_WINDOW");
            var r = FrequencyEvaluator.evaluate(regla,
                    List.of(LocalDate.of(2026, 1, 10)), DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.ON_TARGET);
            assertThat(r.outOfSeason()).isZero();
        }
    }

    @Nested
    @DisplayName("Casos sin veredicto")
    class SinVeredicto {

        @Test
        @DisplayName("ON_DEMAND nunca incumple")
        void aDemanda() {
            var regla = new FrequencyRule(3L, "ON_DEMAND", null, null, null, null, null,
                    null, null, List.of(), LocalDate.of(2020, 1, 1), null);
            var r = FrequencyEvaluator.evaluate(regla, List.of(), DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.NOT_APPLICABLE);
        }

        @Test
        @DisplayName("sin configuracion da NOT_CONFIGURED, no OVERDUE")
        void sinConfiguracion() {
            // Es un pendiente de configuracion, no una falta operativa.
            var r = FrequencyEvaluator.evaluate(null, List.of(), DESDE, HASTA);

            assertThat(r.status()).isEqualTo(ComplianceStatus.NOT_CONFIGURED);
        }

        @Test
        @DisplayName("un tipo de regla sin evaluador falla rapido")
        void tipoDesconocido() {
            // Fail Fast: un codigo sembrado sin su evaluador debe romper aqui y
            // no devolver un veredicto silencioso que nadie calculo.
            var regla = new FrequencyRule(4L, "INVENTADO", null, null, null, null, null,
                    null, null, List.of(), LocalDate.of(2020, 1, 1), null);

            assertThatThrownBy(() -> FrequencyEvaluator.evaluate(regla, List.of(), DESDE, HASTA))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("INVENTADO");
        }
    }

    @Nested
    @DisplayName("Vigencia temporal")
    class Vigencia {

        @Test
        @DisplayName("cambiar la regla no altera el veredicto de un periodo ya evaluado")
        void elPasadoNoSeReescribe() {
            // La razon de ser de la vigencia: relajar el limite en noviembre no
            // puede volver cumplidos los meses juzgados como incumplidos.
            var reglaVieja = new FrequencyRule(10L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 10, 31));
            var reglaNueva = new FrequencyRule(11L, "INTERVAL_DAYS", 30, 30, 90, null, null,
                    null, null, List.of(), LocalDate.of(2026, 11, 1), null);

            var ejecuciones = List.of(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 4, 20));

            // Marzo-abril se evalua con la vieja, que es la que regia.
            var r = FrequencyEvaluator.evaluateAcrossVersions(
                    List.of(reglaVieja, reglaNueva), ejecuciones,
                    LocalDate.of(2026, 3, 1), LocalDate.of(2026, 4, 30));

            assertThat(r).hasSize(1);
            assertThat(r.get(0).status()).isEqualTo(ComplianceStatus.OVERDUE);
            assertThat(r.get(0).evaluatedWithConfigId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("un periodo que abarca dos versiones devuelve un tramo por version")
        void unTramoPorVersion() {
            // No se promedian: un promedio entre dos limites distintos no
            // significa nada y borraria con que regla se juzgo cada tramo.
            var v1 = new FrequencyRule(10L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30));
            var v2 = new FrequencyRule(11L, "INTERVAL_DAYS", 30, 30, 90, null, null,
                    null, null, List.of(), LocalDate.of(2026, 7, 1), null);

            var r = FrequencyEvaluator.evaluateAcrossVersions(List.of(v1, v2),
                    List.of(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 20),
                            LocalDate.of(2026, 8, 1), LocalDate.of(2026, 9, 20)),
                    DESDE, HASTA);

            assertThat(r).hasSize(2);
            assertThat(r).extracting(ComplianceResult::evaluatedWithConfigId)
                    .containsExactly(10L, 11L);
            assertThat(r.get(0).periodEnd()).isEqualTo(LocalDate.of(2026, 6, 30));
            assertThat(r.get(1).periodStart()).isEqualTo(LocalDate.of(2026, 7, 1));
        }

        @Test
        @DisplayName("una version fuera del periodo consultado no aparece")
        void versionFueraDelPeriodo() {
            var vieja = new FrequencyRule(10L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2020, 1, 1), LocalDate.of(2020, 12, 31));
            var actual = new FrequencyRule(11L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2026, 1, 1), null);

            var r = FrequencyEvaluator.evaluateAcrossVersions(List.of(vieja, actual),
                    List.of(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 3)), DESDE, HASTA);

            assertThat(r).hasSize(1);
            assertThat(r.get(0).evaluatedWithConfigId()).isEqualTo(11L);
        }

        @Test
        @DisplayName("sin ninguna version vigente en el periodo da NOT_CONFIGURED")
        void sinVersionVigente() {
            var vieja = new FrequencyRule(10L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2020, 1, 1), LocalDate.of(2020, 12, 31));

            var r = FrequencyEvaluator.evaluateAcrossVersions(List.of(vieja), List.of(), DESDE, HASTA);

            assertThat(r).hasSize(1);
            assertThat(r.get(0).status()).isEqualTo(ComplianceStatus.NOT_CONFIGURED);
        }

        @Test
        @DisplayName("rigeEn incluye el ultimo dia de vigencia")
        void vigenciaInclusiva() {
            var v = new FrequencyRule(10L, "INTERVAL_DAYS", 30, 30, 45, null, null,
                    null, null, List.of(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30));

            assertThat(v.rigeEn(LocalDate.of(2026, 6, 30))).isTrue();
            assertThat(v.rigeEn(LocalDate.of(2026, 7, 1))).isFalse();
            assertThat(v.rigeEn(LocalDate.of(2025, 12, 31))).isFalse();
        }
    }
}
