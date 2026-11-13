package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SPEC-202 §3.3 and CA-S01 to CA-S07: the weekly report of a sector. The clock is Wed 4 Nov 2026. */
class ReportsWeeklyIntegrationTest extends ReportsIntegrationSupport {

    private ReportFixtures.Account coordinator;
    private ReportFixtures.Account operator;
    private ReportFixtures.Account foreman;
    private long type;
    private long team;
    private long sector;
    private long first;
    private long second;
    private double lon;

    @BeforeEach
    void sectorWithTwoSections() {
        coordinator = fx.account("COORDINADOR");
        operator = fx.account("OPERARIO");
        foreman = fx.account("SUPERVISOR");
        type = fx.anyType();
        sector = fx.sector();
        team = fx.team(foreman.id(), sector);
        first = fx.section(sector, "1000");
        second = fx.section(sector, "3000");
        // Each test draws its sections far from the others', so a point is never inside two of them.
        lon = -70.0 - sector * 0.01;
        fx.square(first, lon, -12.0);
    }

    private ResultActions week(String weekStart, ReportFixtures.Account reader) throws Exception {
        return mvc.perform(get("/api/v1/reports/weekly").with(as(reader))
                .param("weekStart", weekStart).param("sectorId", String.valueOf(sector)));
    }

    @Test
    void theShapeOfTheWeekIsCheckedBeforeQuerying() throws Exception {
        week("2026-10-28", coordinator).andExpect(status().isBadRequest());
        week("2026-11-09", coordinator).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/reports/weekly").with(as(coordinator))).andExpect(status().isBadRequest());
        week("2026-10-26", operator).andExpect(status().isForbidden());
    }

    @Test
    void listsTheApprovedWorkOfTheWeekAndComparesItWithThePreviousOne() throws Exception {
        fx.approvedWork(type, team, operator, coordinator, first, "2026-10-28 15:00");
        fx.approvedWork(type, team, operator, coordinator, second, "2026-10-21 15:00");
        long pending = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(pending, second, null, "COMPLETED", "2026-10-29 15:00", false, operator, coordinator);

        week("2026-10-26", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.week.weekEnd").value("2026-11-01"))
                .andExpect(jsonPath("$.data.week.inProgress").value(false))
                .andExpect(jsonPath("$.data.scope").value("SECTOR"))
                .andExpect(jsonPath("$.data.sector.totalSections").value(2))
                .andExpect(jsonPath("$.data.interventions.approved").value(1))
                .andExpect(jsonPath("$.data.interventions.approvedPreviousWeek").value(1))
                .andExpect(jsonPath("$.data.interventions.pendingApproval").value(1))
                .andExpect(jsonPath("$.data.interventions.items.items[0].lastExecutionDate").value("2026-10-28"))
                .andExpect(jsonPath("$.data.interventions.items.items[0].places[0].kind").value("ZONE"))
                .andExpect(jsonPath("$.data.interventions.items.items[0].places[0].id").value((int) first))
                .andExpect(jsonPath("$.data.attendedSections.covered").value(1))
                .andExpect(jsonPath("$.data.attendedSections.percent").value(50.0))
                .andExpect(jsonPath("$.data.teams[0].id").value((int) team));
    }

    @Test
    void irrigationCountsOnlyTurnsOfTheSectorAndListsWhatWasLeftDry() throws Exception {
        long otherSector = fx.sector();
        fx.turn(sector, foreman, "2026-10-12", first, second);
        fx.turn(sector, foreman, "2026-10-27", first);
        fx.turn(otherSector, foreman, "2026-10-28", second);

        week("2026-10-26", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.irrigation.rule").value("PROVISIONAL_ONE_TURN_PER_SECTION"))
                .andExpect(jsonPath("$.data.irrigation.turns").value(1))
                .andExpect(jsonPath("$.data.irrigation.irrigatedSections").value(1))
                .andExpect(jsonPath("$.data.irrigation.percent").value(50.0))
                .andExpect(jsonPath("$.data.irrigation.notIrrigated.total").value(1))
                .andExpect(jsonPath("$.data.irrigation.notIrrigated.items[0].sectionId").value((int) second))
                .andExpect(jsonPath("$.data.irrigation.notIrrigated.items[0].lastIrrigatedOn").value("2026-10-12"));

        week("2026-10-19", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.irrigation.turns").value(0))
                .andExpect(jsonPath("$.data.irrigation.percent").value(nullValue()));
    }

    @Test
    void incidentsAreLocatedByCoordinatesOrByTeamAndTakenAtTheCutoff() throws Exception {
        long byPoint = fx.incident(coordinator, null, "OPEN", "2026-10-29T10:00:00-05:00", -12.0, lon);
        long byTeam = fx.incident(coordinator, team, "OPEN", "2026-10-30T10:00:00-05:00", null, null);
        long resolved = fx.incident(coordinator, team, "OPEN", "2026-10-20T10:00:00-05:00", null, null);
        fx.changeStatus(resolved, "RESOLVED", "2026-10-27T10:00:00-05:00", coordinator);

        week("2026-10-26", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.incidents.asOf").value("2026-11-01"))
                .andExpect(jsonPath("$.data.incidents.open").value(2))
                .andExpect(jsonPath("$.data.incidents.items.items[?(@.id==%d)].locatedBy", byPoint)
                        .value(contains("COORDINATES")))
                .andExpect(jsonPath("$.data.incidents.items.items[?(@.id==%d)].daysOpen", byPoint).value(contains(3)))
                .andExpect(jsonPath("$.data.incidents.items.items[?(@.id==%d)].locatedBy", byTeam)
                        .value(contains("TEAM")))
                .andExpect(jsonPath("$.data.incidents.items.items[?(@.id==%d)]", resolved).value(empty()));

        // Open at the cutoff of the previous week, resolved on Tuesday 27 (CA-S05).
        week("2026-10-19", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.incidents.items.items[?(@.id==%d)]", resolved).value(hasSize(1)));
    }

    @Test
    void theForemanOnlyOpensTheSectorsOfTheirTeams() throws Exception {
        week("2026-10-26", foreman).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope").value("TEAMS"))
                .andExpect(jsonPath("$.data.incidents.unlocatedInScope").value(nullValue()));

        ReportFixtures.Account stranger = fx.account("SUPERVISOR");
        fx.team(stranger.id(), fx.sector());
        week("2026-10-26", stranger).andExpect(status().isNotFound());
    }

    @Test
    void theCurrentWeekIsInProgressAndCutsAtToday() throws Exception {
        week("2026-11-02", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.week.inProgress").value(true))
                .andExpect(jsonPath("$.data.week.cutoffDate").value("2026-11-04"));
    }
}
