package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.Defaults;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.Period;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.SectorOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.TeamOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportSectionResponse;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportsServiceImpl implements ReportsService {

    private final ReportScopeResolver scopes;
    private final ReportCalendar calendar;
    private final IrrigationZoneQueries zones;
    private final TeamsRepository teams;
    private final InterventionReportQueries interventions;

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

    /** 404 and not 403 for a sector outside the scope: it must not confirm that it exists (§3.6). */
    static void requireSector(ReportScope scope, Long sectorId) {
        if (!scope.canOpenSector(sectorId)) {
            throw new ResourceNotFoundException("Sector no disponible");
        }
    }
}
