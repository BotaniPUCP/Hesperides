package pe.edu.pucp.hesperides.modules.interventions.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Compares planned dates with the campus civil day, independently of the host zone. */
@Component
public class InterventionExecutionSchedule {
    private final Clock clock;

    @Autowired
    public InterventionExecutionSchedule(@Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this(Clock.system(ZoneId.of(timeZone)));
    }

    InterventionExecutionSchedule(Clock clock) {
        this.clock = clock;
    }

    public void requirePlanningDate(LocalDate scheduledDate) {
        if (scheduledDate.isBefore(LocalDate.now(clock))) {
            throw new BusinessRuleException("Scheduled date cannot be in the past");
        }
    }

    public boolean canExecute(LocalDate scheduledDate) {
        return !scheduledDate.isAfter(LocalDate.now(clock));
    }

    public void requireAvailable(LocalDate scheduledDate) {
        if (!canExecute(scheduledDate)) {
            throw new BusinessRuleException("Execution cannot begin before the scheduled date");
        }
    }
}
