package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SPEC-202 D-01 to D-04, CA-M01, CA-M02 and CA-M06: what covers a section and when. */
class ReportsCoverageIntegrationTest extends ReportsIntegrationSupport {

    private ReportFixtures.Account coordinator;
    private ReportFixtures.Account operator;
    private long type;
    private long team;
    private long sector;
    private long small;
    private long large;

    @BeforeEach
    void sectorWithTwoSections() {
        coordinator = fx.account("COORDINADOR");
        operator = fx.account("OPERARIO");
        type = fx.anyType();
        team = fx.team(fx.account("SUPERVISOR").id(), null);
        sector = fx.sector();
        small = fx.section(sector, "1000");
        large = fx.section(sector, "3000");
    }

    private ResultActions october() throws Exception {
        return mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator))
                .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31")
                .param("sectorId", String.valueOf(sector)))
                .andExpect(status().isOk());
    }

    @Test
    void onlyFinalApprovalCountsAndAnExecutedWorkWaitsAsPending() throws Exception {
        long work = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(work, small, null, "VALIDATED", "2026-10-14 15:00", true, operator, coordinator);
        long second = fx.location(work, small, null, "COMPLETED", "2026-10-15 15:00", false, operator, coordinator);

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(0))
                .andExpect(jsonPath("$.data.interventions.approved").value(0))
                .andExpect(jsonPath("$.data.interventions.pendingApproval").value(1));

        jdbc.update("""
            update intervention_locations set status_item_id=?, validated_at=completed_at + interval '1 hour',
                validated_by_user_id=? where id=?
            """, fx.item("INTERVENTION_STATUS", "VALIDATED"), coordinator.id(), second);

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(1))
                .andExpect(jsonPath("$.data.interventions.approved").value(1))
                .andExpect(jsonPath("$.data.interventions.pendingApproval").value(0));
    }

    @Test
    void coverageIsWeightedByAreaAndLabelsTheProvisionalRule() throws Exception {
        fx.approvedWork(type, team, operator, coordinator, small, "2026-10-20 15:00");

        october().andExpect(jsonPath("$.data.scope").value("CAMPUS"))
                .andExpect(jsonPath("$.data.coverage.rule").value("PROVISIONAL_ONE_APPROVED_PER_SECTION"))
                .andExpect(jsonPath("$.data.coverage.available").value(true))
                .andExpect(jsonPath("$.data.coverage.coveredAreaM2").value(1000.00))
                .andExpect(jsonPath("$.data.coverage.totalAreaM2").value(4000.00))
                .andExpect(jsonPath("$.data.coverage.percent").value(25.0))
                .andExpect(jsonPath("$.data.coverage.totalSections").value(2))
                .andExpect(jsonPath("$.data.sectors", hasSize(1)))
                .andExpect(jsonPath("$.data.sectors[0].sectorId").value((int) sector))
                .andExpect(jsonPath("$.data.sectors[0].percent").value(25.0));
    }

    @Test
    void theCivilDateInTheConfiguredZoneDecidesTheMonth() throws Exception {
        // 02:00 UTC on Nov 1 is 21:00 on Oct 31 in Lima.
        fx.approvedWork(type, team, operator, coordinator, small, "2026-11-01 02:00");

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(1));
        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator)).param("sectorId", String.valueOf(sector)))
                .andExpect(jsonPath("$.data.period.dateFrom").value("2026-11-01"))
                .andExpect(jsonPath("$.data.coverage.coveredSections").value(0));
    }

    @Test
    void piecesOfOneWorkCountAtTheirLastExecutionInTheSection() throws Exception {
        long work = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(work, small, null, "VALIDATED", "2026-10-30 15:00", true, operator, coordinator);
        fx.location(work, small, null, "VALIDATED", "2026-11-02 15:00", true, operator, coordinator);

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(0));
    }

    @Test
    void aSubsectionCoversItsParentAndAPlaceCoversItsZone() throws Exception {
        fx.approvedWork(type, team, operator, coordinator, fx.subsection(small), "2026-10-10 15:00");
        long work = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(work, null, fx.place(large), "VALIDATED", "2026-10-11 15:00", true, operator, coordinator);

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(2))
                .andExpect(jsonPath("$.data.coverage.percent").value(100.0));
    }

    @Test
    void aPointCoversNothingButTheWorkStillCountsAsApproved() throws Exception {
        fx.approvedWork(type, team, operator, coordinator, null, "2026-10-12 15:00");

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(0))
                .andExpect(jsonPath("$.data.interventions.approved").value(0));
        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator))
                        .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31").param("teamId", String.valueOf(team)))
                .andExpect(jsonPath("$.data.interventions.approved").value(1));
    }

    @Test
    void twoWorksInOneSectionCoverItOnceAndCountTwice() throws Exception {
        fx.approvedWork(type, team, operator, coordinator, small, "2026-10-05 15:00");
        fx.approvedWork(type, team, operator, coordinator, small, "2026-10-06 15:00");

        october().andExpect(jsonPath("$.data.coverage.coveredAreaM2").value(1000.00))
                .andExpect(jsonPath("$.data.sectors[0].approvedInterventions").value(2))
                .andExpect(jsonPath("$.data.interventions.approved").value(2));
    }

    @Test
    void observedCancelledAndDeletedWorkNeverCount() throws Exception {
        long observed = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(observed, small, null, "OBSERVED", "2026-10-07 15:00", false, operator, coordinator);
        long cancelled = fx.work(type, team, operator, coordinator, "CANCELLED");
        fx.location(cancelled, small, null, "VALIDATED", "2026-10-07 15:00", true, operator, coordinator);
        long deleted = fx.approvedWork(type, team, operator, coordinator, large, "2026-10-08 15:00");
        jdbc.update("update interventions set deleted_at=now() where id=?", deleted);

        october().andExpect(jsonPath("$.data.coverage.coveredSections").value(0))
                .andExpect(jsonPath("$.data.interventions.approved").value(0))
                .andExpect(jsonPath("$.data.interventions.pendingApproval").value(0));
    }

    @Test
    void aSectionWithoutAreaCountsAsSectionButNotInTheAreas() throws Exception {
        long withoutArea = fx.section(sector, null);
        fx.approvedWork(type, team, operator, coordinator, withoutArea, "2026-10-09 15:00");

        october().andExpect(jsonPath("$.data.coverage.sectionsWithoutArea").value(1))
                .andExpect(jsonPath("$.data.coverage.coveredSections").value(1))
                .andExpect(jsonPath("$.data.coverage.totalSections").value(3))
                .andExpect(jsonPath("$.data.coverage.coveredAreaM2").value(0.00))
                .andExpect(jsonPath("$.data.coverage.percent").value(0.0));
    }

    @Test
    void teamFilterRestrictsTheNumeratorOnly() throws Exception {
        long otherTeam = fx.team(fx.account("SUPERVISOR").id(), null);
        fx.approvedWork(type, team, operator, coordinator, small, "2026-10-09 15:00");
        fx.approvedWork(type, otherTeam, operator, coordinator, large, "2026-10-09 15:00");

        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator)).param("sectorId", String.valueOf(sector))
                        .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31").param("teamId", String.valueOf(team)))
                .andExpect(jsonPath("$.data.coverage.coveredSections").value(1))
                .andExpect(jsonPath("$.data.coverage.totalSections").value(2))
                .andExpect(jsonPath("$.data.coverage.percent").value(25.0));
    }

    @Test
    void sectionsWithoutASectorFormTheirOwnRow() throws Exception {
        fx.section(null, "500");

        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator)))
                .andExpect(jsonPath("$.data.sectors[-1].sectorId").value(nullValue()))
                .andExpect(jsonPath("$.data.sectors[-1].name").value("Sin sector"))
                .andExpect(jsonPath("$.data.sectors[-1].totalSections").value(greaterThanOrEqualTo(1)));
    }
}
