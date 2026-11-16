package pe.edu.pucp.hesperides.modules.campusevents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.campusevents.EventOccurrences;
import pe.edu.pucp.hesperides.engine.campusevents.EventReach;
import pe.edu.pucp.hesperides.engine.campusevents.EventScope;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Warning;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.EventRow;
import pe.edu.pucp.hesperides.modules.campusevents.repository.CampusEventQueries.NamedGarden;
import pe.edu.pucp.hesperides.modules.campusevents.service.CampusEventCalendar.Dated;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/**
 * Los avisos al programar trabajo o reservar (SPEC-114 §5.4): un evento solo avisa, nunca
 * impide (D-05). Un feriado avisa siempre; un bloqueante, si toca alguno de los jardines y,
 * con horario de los dos lados, si los horarios se cruzan.
 */
@Component
@RequiredArgsConstructor
public class CampusEventWarnings {

    static final String SEVERITY = "WARNING";

    private final CampusEventQueries queries;
    private final CampusEventCalendar calendar;

    public List<Warning> forWork(List<LocalDate> dates, List<Long> zoneIds, List<Long> placeIds,
                                 LocalTime startTime, LocalTime endTime) {
        List<Long> zones = zoneIds == null ? List.of() : zoneIds;
        List<Long> places = placeIds == null ? List.of() : placeIds;
        if (dates == null || dates.isEmpty() || (zones.isEmpty() && places.isEmpty())) {
            return List.of();
        }
        List<NamedGarden> gardens = queries.gardens(zones, places);
        List<Warning> found = new ArrayList<>();
        for (LocalDate date : new TreeSet<>(dates)) {
            for (Dated d : calendar.between(date, date)) {
                warning(d, gardens, startTime, endTime, found);
            }
        }
        return found;
    }

    private static void warning(Dated d, List<NamedGarden> gardens, LocalTime from, LocalTime to, List<Warning> found) {
        EventRow e = d.event();
        String day = CampusEventCalendar.day(d.date());
        if (CampusEventRules.HOLIDAY.equals(e.typeCode())) {
            found.add(new Warning("HOLIDAY", SEVERITY, "El " + day + " es feriado: " + e.name(), e.id()));
            return;
        }
        boolean touches = gardens.stream().anyMatch(g -> EventReach.touches(e.scope(), e.reachZoneId(), g.garden()));
        if (!e.zoneActive() || !touches || !EventOccurrences.crosses(e.rule(), from, to)) {
            return;
        }
        String where = e.scope() == EventScope.CAMPUS ? "todo el campus" : e.zoneName();
        String hours = CampusEventCalendar.hours(e);
        String when = hours.isEmpty() ? "El " + day : "El " + day + ", " + hours;
        found.add(new Warning("CAMPUS_EVENT", SEVERITY, when + " hay " + e.name() + " en " + where, e.id()));
    }
}
