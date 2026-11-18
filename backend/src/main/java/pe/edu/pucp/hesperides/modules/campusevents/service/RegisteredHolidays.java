package pe.edu.pucp.hesperides.modules.campusevents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.campusevents.CampusHolidays;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

/** Los feriados son los días de los eventos de tipo Feriado (SPEC-114 D-02). */
@Component
@RequiredArgsConstructor
public class RegisteredHolidays implements CampusHolidays {

    private final CampusEventCalendar calendar;

    @Override
    @Transactional(readOnly = true)
    public Set<LocalDate> between(LocalDate from, LocalDate to) {
        return calendar.between(from, to).stream()
                .filter(d -> CampusEventRules.HOLIDAY.equals(d.event().typeCode()))
                .map(CampusEventCalendar.Dated::date).collect(Collectors.toUnmodifiableSet());
    }
}
