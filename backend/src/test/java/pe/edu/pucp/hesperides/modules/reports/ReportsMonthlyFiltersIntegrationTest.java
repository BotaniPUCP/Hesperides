package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SPEC-202 §3.4 and §3.6: shape and coherence of the monthly filters, scope and incident counters. */
class ReportsMonthlyFiltersIntegrationTest extends ReportsIntegrationSupport {

    private ReportFixtures.Account coordinator;
    private long sector;

    @BeforeEach
    void data() {
        coordinator = fx.account("COORDINADOR");
        sector = fx.sector();
    }

    private static MockHttpServletRequestBuilder monthly() {
        return get("/api/v1/reports/monthly");
    }

    @Test
    void malformedOrIncoherentFiltersAreBadRequests() throws Exception {
        long foreignSection = fx.section(fx.sector(), "10");
        long type = fx.anyType();
        long otherClass = jdbc.queryForObject("""
            select c.id from catalog_items c join catalog_types t on t.id=c.catalog_type_id
            where t.code='INTERVENTION_CLASS' and c.id<>? and c.deleted_at is null order by c.id limit 1
            """, Long.class, fx.classOf(type));

        mvc.perform(monthly().with(as(coordinator)).param("dateFrom", "2026-10-01")).andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("dateFrom", "2026-10-31").param("dateTo", "2026-10-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("dateFrom", "2026-01-01").param("dateTo", "2027-01-02"))
                .andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("dateFrom", "2026-02-30").param("dateTo", "2026-03-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("sectorId", String.valueOf(sector))
                .param("sectionId", String.valueOf(foreignSection))).andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("classItemId", String.valueOf(type)))
                .andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("typeItemId", String.valueOf(fx.classOf(type))))
                .andExpect(status().isBadRequest());
        mvc.perform(monthly().with(as(coordinator)).param("classItemId", String.valueOf(otherClass))
                .param("typeItemId", String.valueOf(type))).andExpect(status().isBadRequest());
    }

    @Test
    void unknownIdsAreNotFound() throws Exception {
        mvc.perform(monthly().with(as(coordinator)).param("sectorId", "999999999")).andExpect(status().isNotFound());
        mvc.perform(monthly().with(as(coordinator)).param("teamId", "999999999")).andExpect(status().isNotFound());
        mvc.perform(monthly().with(as(coordinator)).param("sectionId", "999999999")).andExpect(status().isNotFound());
        mvc.perform(monthly().with(as(coordinator)).param("sectionId", String.valueOf(sector)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aCoherentClassAndTypeAreAccepted() throws Exception {
        long type = fx.anyType();

        mvc.perform(monthly().with(as(coordinator)).param("classItemId", String.valueOf(fx.classOf(type)))
                        .param("typeItemId", String.valueOf(type)).param("sectorId", String.valueOf(sector)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period.timeZone").value("America/Lima"));
    }

    @Test
    void supervisorSeesTheWorkOfTheirTeamsInTheirSectorsOnly() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        var operator = fx.account("OPERARIO");
        long ownTeam = fx.team(foreman.id(), sector);
        long otherTeam = fx.team(fx.account("SUPERVISOR").id(), fx.sector());
        long section = fx.section(sector, "100");
        long type = fx.anyType();
        fx.approvedWork(type, otherTeam, operator, coordinator, section, "2026-11-02 15:00");

        mvc.perform(monthly().with(as(foreman)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope").value("TEAMS"))
                .andExpect(jsonPath("$.data.coverage.totalSections").value(1))
                .andExpect(jsonPath("$.data.coverage.coveredSections").value(0));
        fx.approvedWork(type, ownTeam, operator, coordinator, section, "2026-11-03 15:00");
        mvc.perform(monthly().with(as(foreman)))
                .andExpect(jsonPath("$.data.coverage.coveredSections").value(1))
                .andExpect(jsonPath("$.data.interventions.approved").value(1));
        mvc.perform(monthly().with(as(foreman)).param("teamId", String.valueOf(otherTeam)))
                .andExpect(status().isNotFound());
        mvc.perform(monthly().with(as(foreman)).param("sectorId", String.valueOf(fx.sector())))
                .andExpect(status().isNotFound());
    }

    @Test
    void supervisorWithoutSectorHasNoCoverageToMeasure() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        fx.team(foreman.id(), null);

        mvc.perform(monthly().with(as(foreman)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coverage.available").value(false))
                .andExpect(jsonPath("$.data.coverage.unavailableReason").value("NO_SECTOR_ASSIGNED"))
                .andExpect(jsonPath("$.data.coverage.percent").value(nullValue()))
                .andExpect(jsonPath("$.data.sectors", empty()));
    }

    @Test
    void incidentStatesAreTakenAtTheEndOfThePeriodAndFilteredByTeam() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        long team = fx.team(foreman.id(), sector);
        long incident = fx.incident(foreman, team, "OPEN", "2026-10-10T10:00:00-05:00", null, null);
        fx.changeStatus(incident, "IN_PROGRESS", "2026-10-12T10:00:00-05:00", coordinator);
        fx.changeStatus(incident, "RESOLVED", "2026-11-02T10:00:00-05:00", foreman);
        fx.incident(foreman, fx.team(fx.account("SUPERVISOR").id(), null), "OPEN", "2026-10-11T10:00:00-05:00", null, null);

        mvc.perform(monthly().with(as(coordinator)).param("teamId", String.valueOf(team))
                        .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31"))
                .andExpect(jsonPath("$.data.incidents.inProgress").value(1))
                .andExpect(jsonPath("$.data.incidents.open").value(0))
                .andExpect(jsonPath("$.data.incidents.reportedInPeriod").value(1))
                .andExpect(jsonPath("$.data.incidents.resolvedInPeriod").value(0));
        mvc.perform(monthly().with(as(coordinator)).param("teamId", String.valueOf(team)))
                .andExpect(jsonPath("$.data.incidents.inProgress").value(0))
                .andExpect(jsonPath("$.data.incidents.reportedInPeriod").value(0))
                .andExpect(jsonPath("$.data.incidents.resolvedInPeriod").value(1));
    }

    @Test
    void supervisorCountsTheIncidentsTheySentOrTheirTeamsReceived() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        var other = fx.account("SUPERVISOR");
        long team = fx.team(foreman.id(), sector);
        long otherTeam = fx.team(other.id(), null);
        fx.incident(foreman, otherTeam, "PENDING_APPROVAL", "2026-11-03T10:00:00-05:00", null, null);
        fx.incident(other, team, "OPEN", "2026-11-03T11:00:00-05:00", null, null);
        fx.incident(other, otherTeam, "OPEN", "2026-11-03T12:00:00-05:00", null, null);

        mvc.perform(monthly().with(as(foreman)))
                .andExpect(jsonPath("$.data.incidents.pendingApproval").value(1))
                .andExpect(jsonPath("$.data.incidents.open").value(1))
                .andExpect(jsonPath("$.data.incidents.reportedInPeriod").value(2));
    }
}
