package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportFilter;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.ZoneRef;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionReportQueries.CatalogRef;
import pe.edu.pucp.hesperides.modules.reports.repository.ReportFilter;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Objects;

/**
 * Checks the monthly filters against the data and the scope (SPEC-202 §3.4).
 * An id that does not exist or lies outside the scope is a 404, so it does not
 * confirm what the reader cannot see; an incoherent combination is a 400.
 * The shape of the period is checked earlier, by the controller.
 */
@Component
@RequiredArgsConstructor
public class MonthlyFilterValidator {

    private final CoverageQueries zones;
    private final InterventionReportQueries catalog;
    private final TeamsRepository teams;
    private final ReportCalendar calendar;

    public ReportFilter resolve(MonthlyReportFilter request, ReportScope scope) {
        DateRange period = request.dateFrom() == null
                ? ReportPeriods.currentMonth(calendar.today())
                : new DateRange(request.dateFrom(), request.dateTo());
        if (request.sectorId() != null) {
            ReportsServiceImpl.requireSector(scope, request.sectorId());
        }
        if (request.sectionId() != null) {
            checkSection(request, scope);
        }
        if (request.teamId() != null) {
            checkTeam(request.teamId(), scope);
        }
        if (request.classItemId() != null) {
            requireCatalog(request.classItemId(), "INTERVENTION_CLASS", "La clase no pertenece al catálogo de clases");
        }
        if (request.typeItemId() != null) {
            CatalogRef type = requireCatalog(request.typeItemId(), "INTERVENTION_TYPE",
                    "El tipo no pertenece al catálogo de tipos");
            if (request.classItemId() != null && !Objects.equals(type.parentId(), request.classItemId())) {
                throw new ValidationException("El tipo no pertenece a la clase elegida");
            }
        }
        return new ReportFilter(period, calendar.zone(), request.sectorId(), request.sectionId(), request.teamId(),
                request.classItemId(), request.typeItemId(), scope.campus(), scope.userId(),
                scope.teamIds(), scope.sectorIds());
    }

    private void checkSection(MonthlyReportFilter request, ReportScope scope) {
        ZoneRef section = zones.zone(request.sectionId())
                .filter(zone -> "SECTION".equals(zone.typeCode()))
                .orElseThrow(() -> new ResourceNotFoundException("Sección no disponible"));
        if (!scope.campus() && !scope.canOpenSector(section.parentId())) {
            throw new ResourceNotFoundException("Sección no disponible");
        }
        if (request.sectorId() != null && !Objects.equals(section.parentId(), request.sectorId())) {
            throw new ValidationException("La sección no pertenece al sector elegido");
        }
    }

    private void checkTeam(Long teamId, ReportScope scope) {
        boolean visible = teams.findById(teamId)
                .filter(team -> team.isActive() && team.getDeletedAt() == null)
                .isPresent();
        if (!visible || (!scope.campus() && !scope.teamIds().contains(teamId))) {
            throw new ResourceNotFoundException("Cuadrilla no disponible");
        }
    }

    private CatalogRef requireCatalog(Long id, String typeCode, String message) {
        return catalog.catalogItem(id)
                .filter(item -> typeCode.equals(item.typeCode()))
                .orElseThrow(() -> new ValidationException(message));
    }
}
