package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.machinery.MachineryDays;
import pe.edu.pucp.hesperides.modules.campusevents.CampusHolidays;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.time.LocalDate;

/**
 * La maquinaria de corte solo se programa sábados, domingos y feriados del calendario del
 * campus (SPEC-115 D-03): la regla impide guardar; un evento bloqueante ese día solo avisa.
 */
@Component
@RequiredArgsConstructor
public class CuttingMachineryRule {

    private final CampusHolidays holidays;

    public void requireAllowed(LocalDate scheduledDate) {
        if (!MachineryDays.allowed(scheduledDate, holidays.between(scheduledDate, scheduledDate))) {
            throw new BusinessRuleException("Cutting machinery can only be scheduled on Saturdays, Sundays or holidays");
        }
    }
}
