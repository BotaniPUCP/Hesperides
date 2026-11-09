package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.planning.GardenHistory;
import pe.edu.pucp.hesperides.engine.planning.GardenHistory.GardenDate;
import pe.edu.pucp.hesperides.engine.planning.OpenRound;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.modules.planning.attendance.OpenWork;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Traduce lo que entregan las intervenciones a lo que entiende el Engine. */
final class AttendanceHistory {

    private final Map<Long, List<GardenDate>> byZone;

    private AttendanceHistory(Map<Long, List<GardenDate>> byZone) {
        this.byZone = byZone;
    }

    static AttendanceHistory of(List<GardenCompletion> completions) {
        Map<Long, List<GardenDate>> byZone = new HashMap<>();
        completions.forEach(c -> byZone.computeIfAbsent(c.zoneId(), k -> new ArrayList<>())
                .add(new GardenDate(c.interventionId(), c.date())));
        return new AttendanceHistory(byZone);
    }

    static List<OpenRound> rounds(List<OpenWork> works) {
        return works.stream().map(w -> new OpenRound(w.interventionId(), w.code(), w.scheduledDate(),
                w.firstStartedDate(), w.zoneIds(), w.pendingZoneIds())).toList();
    }

    /** La historia de cada jardín del conjunto; un jardín sin fechas entra con la lista vacía. */
    List<GardenHistory> of(Collection<Long> zoneIds) {
        return zoneIds.stream().sorted().map(z -> new GardenHistory(z, byZone.getOrDefault(z, List.of()))).toList();
    }

    LocalDate lastOf(long zoneId) {
        return new GardenHistory(zoneId, byZone.getOrDefault(zoneId, List.of())).last();
    }
}
