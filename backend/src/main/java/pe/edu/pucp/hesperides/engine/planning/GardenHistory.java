package pe.edu.pucp.hesperides.engine.planning;

import java.time.LocalDate;
import java.util.List;

/** Las veces que un jardín se completó para una actividad, en cualquier orden. */
public record GardenHistory(long zoneId, List<GardenDate> dates) {

    public GardenHistory {
        dates = dates == null ? List.of() : List.copyOf(dates);
    }

    public record GardenDate(long interventionId, LocalDate date) {
    }

    public LocalDate last() {
        return dates.stream().map(GardenDate::date).max(LocalDate::compareTo).orElse(null);
    }
}
