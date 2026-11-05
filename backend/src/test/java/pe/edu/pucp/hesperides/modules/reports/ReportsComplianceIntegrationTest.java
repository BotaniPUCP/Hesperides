package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SPEC-202 D-05, CA-M04, CA-M05 and §3.6: compliance per activity and the section lists. */
class ReportsComplianceIntegrationTest extends ReportsIntegrationSupport {

    /** Two active types other than the one the coverage tests use, so frequencies never collide. */
    private List<Long> typesForFrequencies() {
        return jdbc.queryForList("""
            select t.id from catalog_items t join catalog_items c on c.id=t.parent_item_id
            join catalog_types tt on tt.id=t.catalog_type_id and tt.code='INTERVENTION_TYPE'
            where t.is_active and t.deleted_at is null and c.is_active and c.deleted_at is null
            order by t.id desc limit 2
            """, Long.class);
    }

    private void frequency(long activity, String regime) {
        jdbc.update("update maintenance_frequencies set deleted_at=now() where activity_type_item_id=? and deleted_at is null",
                activity);
        jdbc.update("""
            insert into maintenance_frequencies(activity_type_item_id,frequency_rule_type_item_id,regime,scope,
                target_days_interval,min_days_interval,max_days_interval,valid_from)
            values (?,?,?,'CAMPUS_WIDE',7,1,10,date '2026-01-01')
            """, activity, fx.item("FREQUENCY_RULE_TYPE", "INTERVAL_DAYS"), regime);
    }

    @Test
    void complianceCountsPlacesByVerdictAndMarksOutsourcedAsNotEvaluable() throws Exception {
        var coordinator = fx.account("COORDINADOR");
        var operator = fx.account("OPERARIO");
        long team = fx.team(fx.account("SUPERVISOR").id(), null);
        List<Long> types = typesForFrequencies();
        long inHouse = types.get(0);
        long outsourced = types.get(1);
        frequency(inHouse, "IN_HOUSE");
        frequency(outsourced, "OUTSOURCED");
        long sector = fx.sector();
        long late = fx.section(sector, "100");
        long onTime = fx.section(sector, "200");
        // One execution on Oct 2 and nothing since: 29 days exceed the limit of 10.
        fx.approvedWork(inHouse, team, operator, coordinator, late, "2026-10-02 15:00");
        fx.approvedWork(inHouse, team, operator, coordinator, onTime, "2026-10-24 15:00");
        fx.approvedWork(inHouse, team, operator, coordinator, onTime, "2026-10-29 15:00");

        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator)).param("sectorId", String.valueOf(sector))
                        .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + inHouse + ")].evaluable")
                        .value(contains(true)))
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + inHouse + ")].overdue")
                        .value(contains(1)))
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + inHouse + ")].onTarget")
                        .value(contains(1)))
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + inHouse + ")].overdueTargets[0].targetId")
                        .value(contains((int) late)))
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + outsourced + ")].evaluable")
                        .value(contains(false)))
                .andExpect(jsonPath("$.data.compliance[?(@.activityTypeItemId == " + outsourced + ")].notEvaluableReason")
                        .value(contains("OUTSOURCED")));
    }

    @Test
    void sectionListsShowTheMostAttendedAndTheLongestUnattended() throws Exception {
        var coordinator = fx.account("COORDINADOR");
        var operator = fx.account("OPERARIO");
        long team = fx.team(fx.account("SUPERVISOR").id(), null);
        long type = fx.anyType();
        long sector = fx.sector();
        long busy = fx.section(sector, "100");
        long once = fx.section(sector, "100");
        long lastSeptember = fx.section(sector, "100");
        long never = fx.section(sector, "100");
        fx.approvedWork(type, team, operator, coordinator, busy, "2026-10-03 15:00");
        fx.approvedWork(type, team, operator, coordinator, busy, "2026-10-04 15:00");
        fx.approvedWork(type, team, operator, coordinator, once, "2026-10-05 15:00");
        fx.approvedWork(type, team, operator, coordinator, lastSeptember, "2026-09-15 15:00");

        mvc.perform(get("/api/v1/reports/monthly").with(as(coordinator)).param("sectorId", String.valueOf(sector))
                        .param("dateFrom", "2026-10-01").param("dateTo", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mostAttended.total").value(2))
                .andExpect(jsonPath("$.data.mostAttended.items[0].sectionId").value((int) busy))
                .andExpect(jsonPath("$.data.mostAttended.items[0].approvedInterventions").value(2))
                .andExpect(jsonPath("$.data.mostAttended.items[0].lastAttendedOn").value("2026-10-04"))
                .andExpect(jsonPath("$.data.unattended.total").value(2))
                .andExpect(jsonPath("$.data.unattended.items[*].sectionId", contains((int) never, (int) lastSeptember)))
                .andExpect(jsonPath("$.data.unattended.items[1].lastAttendedOn").value("2026-09-15"))
                .andExpect(jsonPath("$.data.unattended.items[1].approvedInterventions").value(0));
    }
}
