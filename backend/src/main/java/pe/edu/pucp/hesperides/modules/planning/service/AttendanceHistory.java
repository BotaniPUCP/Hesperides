package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.planning.GardenHistory;
import pe.edu.pucp.hesperides.engine.planning.GardenHistory.GardenDate;
import pe.edu.pucp.hesperides.engine.planning.OpenRound;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenSpecimenWork;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenWork;
import pe.edu.pucp.hesperides.modules.planning.attendance.SpecimenCompletion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Traduce lo que entregan las intervenciones a lo que entiende el Engine.
 *
 * <p>El Engine juzga unidades atendidas sin saber qué son. Un jardín y un ejemplar
 * cuentan por separado (SPEC-203 D-14), así que cada uno es una unidad: la sección
 * entra con su id y el ejemplar con el suyo en negativo, para que no choquen (los
 * ids de ambas tablas son positivos).
 */
final class AttendanceHistory {

    private final Map<Long, List<GardenDate>> byUnit;

    private AttendanceHistory(Map<Long, List<GardenDate>> byUnit) {
        this.byUnit = byUnit;
    }

    static long specimenUnit(long elementId) {
        return -elementId;
    }

    static AttendanceHistory of(List<GardenCompletion> gardens, List<SpecimenCompletion> specimens) {
        Map<Long, List<GardenDate>> byUnit = new HashMap<>();
        gardens.forEach(c -> byUnit.computeIfAbsent(c.zoneId(), k -> new ArrayList<>())
                .add(new GardenDate(c.interventionId(), c.date())));
        specimens.forEach(c -> byUnit.computeIfAbsent(specimenUnit(c.elementId()), k -> new ArrayList<>())
                .add(new GardenDate(c.interventionId(), c.date())));
        return new AttendanceHistory(byUnit);
    }

    /** Una intervención con jardines y ejemplares pendientes es una sola ronda abierta. */
    static List<OpenRound> rounds(List<OpenWork> gardens, List<OpenSpecimenWork> specimens) {
        Map<Long, OpenRound> byWork = new LinkedHashMap<>();
        gardens.forEach(w -> byWork.merge(w.interventionId(), new OpenRound(w.interventionId(), w.code(),
                w.scheduledDate(), w.firstStartedDate(), w.zoneIds(), w.pendingZoneIds()), AttendanceHistory::join));
        specimens.forEach(w -> byWork.merge(w.interventionId(), new OpenRound(w.interventionId(), w.code(),
                w.scheduledDate(), w.firstStartedDate(), units(w.elementIds()), units(w.pendingElementIds())),
                AttendanceHistory::join));
        return List.copyOf(byWork.values());
    }

    /** La historia de cada unidad del conjunto; una sin fechas entra con la lista vacía. */
    List<GardenHistory> of(Collection<Long> zoneIds, Collection<Long> elementIds) {
        return Stream.concat(zoneIds.stream().sorted(), elementIds.stream().sorted().map(AttendanceHistory::specimenUnit))
                .map(unit -> new GardenHistory(unit, byUnit.getOrDefault(unit, List.of()))).toList();
    }

    LocalDate lastOf(long zoneId) {
        return new GardenHistory(zoneId, byUnit.getOrDefault(zoneId, List.of())).last();
    }

    private static Set<Long> units(Set<Long> elementIds) {
        Set<Long> out = new HashSet<>();
        elementIds.forEach(id -> out.add(specimenUnit(id)));
        return out;
    }

    private static OpenRound join(OpenRound a, OpenRound b) {
        LocalDate first = a.firstStartedDate() == null ? b.firstStartedDate()
                : b.firstStartedDate() == null || a.firstStartedDate().isBefore(b.firstStartedDate())
                ? a.firstStartedDate() : b.firstStartedDate();
        Set<Long> targets = new HashSet<>(a.zoneIds());
        targets.addAll(b.zoneIds());
        Set<Long> pending = new HashSet<>(a.pendingZoneIds());
        pending.addAll(b.pendingZoneIds());
        return new OpenRound(a.interventionId(), a.code(), a.scheduledDate(), first, targets, pending);
    }
}
