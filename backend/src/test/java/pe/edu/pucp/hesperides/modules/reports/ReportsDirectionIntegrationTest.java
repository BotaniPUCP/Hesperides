package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * SPEC-202 §3.5 and CA-D01 to CA-D07. The summary is always campus-wide and data
 * accumulates between tests, so these assertions use months nobody else writes
 * or check structure and rules rather than totals.
 */
class ReportsDirectionIntegrationTest extends ReportsIntegrationSupport {

    private ResultActions direction(String month, ReportFixtures.Account reader) throws Exception {
        var request = get("/api/v1/reports/direction").with(as(reader));
        return mvc.perform(month == null ? request : request.param("month", month));
    }

    @Test
    void onlyTheCampusRolesReadItAndTheMonthIsChecked() throws Exception {
        ReportFixtures.Account coordinator = fx.account("COORDINADOR");
        direction(null, fx.account("SUPERVISOR")).andExpect(status().isForbidden());
        direction(null, fx.account("OPERARIO")).andExpect(status().isForbidden());
        direction("2026-12", coordinator).andExpect(status().isBadRequest());
        direction("2026-1", coordinator).andExpect(status().isBadRequest());
        direction("2026-13", coordinator).andExpect(status().isBadRequest());
        direction(null, fx.account("ADMIN")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.month").value("2026-10"))
                .andExpect(jsonPath("$.data.previousMonth").value("2026-09"))
                .andExpect(jsonPath("$.data.inProgress").value(false));
        direction("2026-11", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inProgress").value(true));
    }

    @Test
    void indicatorsWithoutSourceAreUnavailableAndTheSeriesHasGapsBeforeTheSystem() throws Exception {
        direction("2020-03", fx.account("COORDINADOR")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.indicators", hasSize(9)))
                .andExpect(jsonPath("$.data.indicators[0].code").value("COVERAGE"))
                .andExpect(jsonPath("$.data.indicators[0].unit").value("PERCENT"))
                .andExpect(jsonPath("$.data.indicators[0].provisional").value(true))
                .andExpect(jsonPath("$.data.indicators[0].previousValue").value(nullValue()))
                .andExpect(jsonPath("$.data.indicators[0].trend").value(nullValue()))
                .andExpect(jsonPath("$.data.indicators[2].code").value("APPROVED_INTERVENTIONS"))
                .andExpect(jsonPath("$.data.indicators[2].value").value(0))
                .andExpect(jsonPath("$.data.indicators[3].higherIsBetter").value(nullValue()))
                .andExpect(jsonPath("$.data.indicators[4].targetReason").value("TARGET_NOT_STORED"))
                .andExpect(jsonPath("$.data.indicators[5].unavailableReason").value("RULE_NOT_DEFINED"))
                .andExpect(jsonPath("$.data.indicators[6].unavailableReason").value("UNIT_NOT_MODELED"))
                .andExpect(jsonPath("$.data.indicators[7].unavailableReason").value("NOT_RECORDED"))
                .andExpect(jsonPath("$.data.indicators[8].unavailableReason").value("NO_DEADLINES_CONFIGURED"))
                .andExpect(jsonPath("$.data.indicators[8].value").value(nullValue()))
                .andExpect(jsonPath("$.data.coverageSeries.points", hasSize(6)))
                .andExpect(jsonPath("$.data.coverageSeries.points[0].month").value("2019-10"))
                .andExpect(jsonPath("$.data.coverageSeries.points[5].month").value("2020-03"))
                .andExpect(jsonPath("$.data.coverageSeries.points[*].recorded", everyItem(is(false))))
                .andExpect(jsonPath("$.data.coverageSeries.points[*].percent", everyItem(nullValue())));
    }

    @Test
    void aMonthWithApprovedWorkIsRecordedInTheSeries() throws Exception {
        ReportFixtures.Account coordinator = fx.account("COORDINADOR");
        ReportFixtures.Account operator = fx.account("OPERARIO");
        long sector = fx.sector();
        long section = fx.section(sector, "500");
        long team = fx.team(fx.account("SUPERVISOR").id(), sector);
        fx.approvedWork(fx.anyType(), team, operator, coordinator, section, "2026-09-15 15:00");

        direction("2026-10", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coverageSeries.points[4].month").value("2026-09"))
                .andExpect(jsonPath("$.data.coverageSeries.points[4].recorded").value(true))
                .andExpect(jsonPath("$.data.coverageSeries.points[4].percent").value(notNullValue()))
                .andExpect(jsonPath("$.data.indicators[0].previousValue").value(notNullValue()))
                .andExpect(jsonPath("$.data.header.sections").value(greaterThan(0)));
    }

    @Test
    void theTargetIsReadFromTheSystemParameters() throws Exception {
        ReportFixtures.Account coordinator = fx.account("COORDINADOR");
        direction("2026-10", coordinator).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.indicators[0].target").value(100.0))
                .andExpect(jsonPath("$.data.coverageSeries.target").value(100.0));
        String code = "REPORT_COVERAGE_TARGET_PERCENT";
        jdbc.update("update system_parameters set value='80' where code=?", code);
        try {
            direction("2026-10", coordinator).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.indicators[0].target").value(80))
                    .andExpect(jsonPath("$.data.indicators[0].targetReason").value(nullValue()));
        } finally {
            jdbc.update("update system_parameters set value='100' where code=?", code);
        }
    }
}
