package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Cómo está cada unidad del conjunto, por separado (SPEC-203 §5.5). La fila juzga al conjunto
 * por la unidad atendida hace más tiempo; esto dice además cuántas están al día, cuáles faltan
 * y en qué fechas se atendieron, para que un avance parcial se vea en la tarjeta.
 *
 * <p>Cada unidad se juzga con la misma regla y el mismo motor que la fila, como si fuera un
 * conjunto de una sola unidad y sin intervenciones abiertas: «al día» es que todavía no le toca
 * ({@code NOT_DUE}) o ya cumplió su periodo ({@code DONE_FOR_PERIOD}).
 *
 * @param upToDate cuántas unidades están al día
 * @param pendingUnits las que no (les toca, están atrasadas o nunca se atendieron), en el orden recibido
 * @param lastDates cuántas unidades se atendieron por última vez en cada fecha, de la más reciente a la
 *                  más antigua; las nunca atendidas van al final con fecha nula
 */
public record UnitBreakdown(int upToDate, List<Long> pendingUnits, List<LastDate> lastDates) {

    public record LastDate(LocalDate date, int count) {
    }

    public UnitBreakdown {
        pendingUnits = List.copyOf(pendingUnits);
        lastDates = List.copyOf(lastDates);
    }

    /** Sin regla no hay con qué juzgar: no hay desglose. */
    public static UnitBreakdown of(FrequencyRule rule, List<GardenHistory> units, LocalDate today) {
        if (rule == null) {
            return null;
        }
        int upToDate = 0;
        List<Long> pending = new ArrayList<>();
        Map<LocalDate, Integer> byDate = new TreeMap<>(Comparator.reverseOrder());
        int never = 0;
        for (GardenHistory unit : units) {
            PlanningState state = PlanningEvaluator.evaluate(rule, List.of(unit), List.of(), today).state();
            if (state == PlanningState.NOT_DUE || state == PlanningState.DONE_FOR_PERIOD) {
                upToDate++;
            } else {
                pending.add(unit.zoneId());
            }
            LocalDate last = unit.last();
            if (last == null) {
                never++;
            } else {
                byDate.merge(last, 1, Integer::sum);
            }
        }
        List<LastDate> dates = new ArrayList<>();
        byDate.forEach((date, count) -> dates.add(new LastDate(date, count)));
        if (never > 0) {
            dates.add(new LastDate(null, never));
        }
        return new UnitBreakdown(upToDate, pending, dates);
    }
}
