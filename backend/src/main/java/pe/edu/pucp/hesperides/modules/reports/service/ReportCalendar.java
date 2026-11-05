package pe.edu.pucp.hesperides.modules.reports.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * The zone and the clock of the reports in one place. The zone is the same
 * property the frequency history uses (hesperides.maintenance.time-zone), so a
 * work falls on the same civil date in both.
 */
@Component
public class ReportCalendar {

    private final Clock clock;
    private final ZoneId zone;

    public ReportCalendar(Clock clock, @Value("${hesperides.maintenance.time-zone:America/Lima}") String timeZone) {
        this.clock = clock;
        this.zone = ZoneId.of(timeZone);
    }

    public ZoneId zone() {
        return zone;
    }

    public LocalDate today() {
        return ReportPeriods.today(clock, zone);
    }

    public Instant now() {
        return clock.instant();
    }
}
