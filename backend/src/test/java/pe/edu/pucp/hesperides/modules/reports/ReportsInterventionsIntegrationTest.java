package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SPEC-202 D-20 and §3.7: the works behind each figure are the very works the
 * figure counts, with the same filters and the same scope. The clock is Wed 4 Nov 2026.
 */
class ReportsInterventionsIntegrationTest extends ReportsIntegrationSupport {

    private static final String WEEK_FROM = "2026-10-26";
    private static final String WEEK_TO = "2026-11-01";

    private ReportFixtures.Account coordinator;
    private ReportFixtures.Account operator;
    private ReportFixtures.Account foreman;
    private long type;
    private long team;
    private long sector;
    private long first;
    private long second;

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
    }

    private ResultActions list(String kind, ReportFixtures.Account reader, String... extra) throws Exception {
        var request = get("/api/v1/reports/interventions").with(as(reader))
                .param("kind", kind).param("dateFrom", WEEK_FROM).param("dateTo", WEEK_TO)
                .param("sectorId", String.valueOf(sector));
        for (int i = 0; i < extra.length; i += 2) {
            request.param(extra[i], extra[i + 1]);
        }
        return mvc.perform(request);
    }

    @Test
    void approvedAndPendingListTheWorksTheWeeklyFiguresCount() throws Exception {
        long thisWeek = fx.approvedWork(type, team, operator, coordinator, first, "2026-10-28 15:00");
        fx.approvedWork(type, team, operator, coordinator, second, "2026-10-21 15:00");
        long pending = fx.work(type, team, operator, coordinator, "ASSIGNED");
        fx.location(pending, second, null, "COMPLETED", "2026-10-29 15:00", false, operator, coordinator);

        mvc.perform(get("/api/v1/reports/weekly").with(as(coordinator))
                        .param("weekStart", WEEK_FROM).param("sectorId", String.valueOf(sector)))
                .andExpect(jsonPath("$.data.interventions.approved").value(1))
                .andExpect(jsonPath("$.data.interventions.pendingApproval").value(1));

        list("APPROVED", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value((int) thisWeek))
                .andExpect(jsonPath("$.data.items[0].lastExecutionDate").value("2026-10-28"))
                .andExpect(jsonPath("$.data.items[0].teamName").value(startsWith("Cuadrilla")));
        list("PENDING_APPROVAL", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value((int) pending));
    }

    @Test
    void aSectionListsTheWorksThatCoveredItInThePeriod() throws Exception {
        long one = fx.approvedWork(type, team, operator, coordinator, first, "2026-10-27 15:00");
        long two = fx.approvedWork(type, team, operator, coordinator, first, "2026-10-30 15:00");
        fx.approvedWork(type, team, operator, coordinator, first, "2026-10-12 15:00");
        fx.approvedWork(type, team, operator, coordinator, second, "2026-10-28 15:00");

        list("ATTENDED_SECTION", coordinator, "sectionId", String.valueOf(first)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2))
                .andExpect(jsonPath("$.data.items[*].id").value(contains((int) two, (int) one)));

        list("ATTENDED_SECTION", coordinator).andExpect(status().isBadRequest());
        list("EVERYTHING", coordinator).andExpect(status().isBadRequest());
    }

    @Test
    void pendingPhotosListEachWorkWithItsUnsentPhotos() throws Exception {
        long work = fx.work(type, team, operator, coordinator, "ASSIGNED");
        long location = fx.location(work, first, null, "IN_PROGRESS", null, false, operator, coordinator);
        fx.pendingPhoto(work, location, operator);
        fx.pendingPhoto(work, location, operator);

        list("PENDING_PHOTOS", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value((int) work))
                .andExpect(jsonPath("$.data.items[0].pendingPhotos").value(2))
                .andExpect(jsonPath("$.data.items[0].lastExecutionDate").value(nullValue()));
    }

    @Test
    void theScopeIsTheSameAsTheReports() throws Exception {
        long mine = fx.approvedWork(type, team, operator, coordinator, first, "2026-10-28 15:00");
        long otherTeam = fx.team(fx.account("SUPERVISOR").id(), sector);
        long theirs = fx.approvedWork(type, otherTeam, operator, coordinator, second, "2026-10-28 15:00");

        list("APPROVED", coordinator).andExpect(jsonPath("$.data.items[*].id")
                .value(containsInAnyOrder((int) mine, (int) theirs)));
        list("APPROVED", foreman).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id").value(contains((int) mine)));

        long foreignSector = fx.sector();
        mvc.perform(get("/api/v1/reports/interventions").with(as(foreman)).param("kind", "APPROVED")
                .param("sectorId", String.valueOf(foreignSector))).andExpect(status().isNotFound());
        list("APPROVED", operator).andExpect(status().isForbidden());
    }
}
