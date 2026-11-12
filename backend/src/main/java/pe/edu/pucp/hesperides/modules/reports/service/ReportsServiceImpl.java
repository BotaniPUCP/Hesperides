package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportFilter;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.Defaults;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.Period;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.SectorOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.TeamOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportSectionResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportsServiceImpl implements ReportsService {

    private final ReportScopeResolver scopes;
    private final ReportCalendar calendar;
    private final IrrigationZoneQueries zones;
    private final TeamsRepository teams;
    private final InterventionReportQueries interventions;
    private final MonthlyFilterValidator monthlyFilters;
    private final MonthlyReportBuilder monthlyReports;
    private final WeeklyReportBuilder weeklyReports;
    private final DirectionReportBuilder directionReports;

    @Override
    @Transactional(readOnly = true)
    public ReportOptionsResponse options(String email) {
        ReportScope scope = scopes.resolve(email);
        LocalDate today = calendar.today();
        DateRange month = ReportPeriods.currentMonth(today);
        var defaults = new Defaults(ReportPeriods.weekStartOf(today),
                new Period(month.from(), month.to()),
                ReportPeriods.lastClosedMonth(today).toString());
        List<SectorOption> sectors = zones.sectors().stream()
                .filter(sector -> scope.canOpenSector(sector.id()))
                .map(sector -> new SectorOption(sector.id(), sector.code(), sector.name()))
                .toList();
        List<Team> visibleTeams = scope.campus()
                ? teams.findByActiveTrueAndDeletedAtIsNullOrderByNameAsc()
                : teams.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNullOrderByNameAsc(scope.userId());
        List<TeamOption> teamOptions = visibleTeams.stream()
                .map(team -> new TeamOption(team.getId(), team.getCode(), team.getName(), team.getZoneId()))
                .toList();
        return new ReportOptionsResponse(calendar.zone().getId(), defaults, sectors, teamOptions,
                interventions.activeClassesWithTypes());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportSectionResponse> sections(Long sectorId, String email) {
        requireSector(scopes.resolve(email), sectorId);
        return zones.sectionsWithAreaOf(sectorId).stream()
                .map(s -> new ReportSectionResponse(s.id(), s.code(), s.name(), s.areaM2()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MonthlyReportResponse monthly(MonthlyReportFilter filter, String email) {
        ReportScope scope = scopes.resolve(email);
        return monthlyReports.build(monthlyFilters.resolve(filter, scope), scope);
    }

    /** §3.3: the week starts on Monday and cannot be later than the current one; the sector is required. */
    @Override
    @Transactional(readOnly = true)
    public WeeklyReportResponse weekly(LocalDate weekStart, Long sectorId, String email) {
        ReportScope scope = scopes.resolve(email);
        LocalDate currentWeek = ReportPeriods.weekStartOf(calendar.today());
        LocalDate start = weekStart == null ? currentWeek : weekStart;
        if (!ReportPeriods.isMonday(start)) {
            throw new ValidationException("La semana debe empezar un lunes");
        }
        if (start.isAfter(currentWeek)) {
            throw new ValidationException("La semana no puede ser posterior a la semana en curso");
        }
        if (sectorId == null) {
            throw new ValidationException("Elige un sector");
        }
        requireSector(scope, sectorId);
        return weeklyReports.build(start, sectorId, scope);
    }

    /** §3.5: campus roles only (D-07, also enforced by the controller); no future month. */
    @Override
    @Transactional(readOnly = true)
    public DirectionReportResponse direction(YearMonth month, String email) {
        ReportScope scope = scopes.resolve(email);
        if (!scope.campus()) {
            throw new AccessDeniedException("El resumen para dirección es del campus completo");
        }
        LocalDate today = calendar.today();
        YearMonth target = month == null ? ReportPeriods.lastClosedMonth(today) : month;
        if (target.isAfter(YearMonth.from(today))) {
            throw new ValidationException("El mes no puede ser posterior al mes en curso");
        }
        return directionReports.build(target);
    }

    /** 404 and not 403 for a sector outside the scope: it must not confirm that it exists (§3.6). */
    static void requireSector(ReportScope scope, Long sectorId) {
        if (!scope.canOpenSector(sectorId)) {
            throw new ResourceNotFoundException("Sector no disponible");
        }
    }
}
