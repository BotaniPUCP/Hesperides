package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SPEC-202 D-07 and D-08, CA-G03 and CA-S06: who may open what. */
class ReportsAccessIntegrationTest extends ReportsIntegrationSupport {

    @Test
    void operatorIsForbiddenOnEveryRoute() throws Exception {
        var operator = fx.account("OPERARIO");
        long sector = fx.sector();

        mvc.perform(get("/api/v1/reports/options").with(as(operator))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/reports/options/sections").param("sectorId", String.valueOf(sector)).with(as(operator)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/reports/monthly").with(as(operator))).andExpect(status().isForbidden());
    }

    @Test
    void adminReadsTheCampusWithoutAGlobalRoleMappingAndGetsTheDefaultPeriods() throws Exception {
        var admin = fx.account("ADMIN");

        mvc.perform(get("/api/v1/reports/options").with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.timeZone").value("America/Lima"))
                .andExpect(jsonPath("$.data.defaults.weekStart").value("2026-11-02"))
                .andExpect(jsonPath("$.data.defaults.monthly.dateFrom").value("2026-11-01"))
                .andExpect(jsonPath("$.data.defaults.monthly.dateTo").value("2026-11-30"))
                .andExpect(jsonPath("$.data.defaults.directionMonth").value("2026-10"))
                .andExpect(jsonPath("$.data.sectors[*].code", hasItems("SEC-VERDE-01", "SEC-POLIDEPORT")))
                .andExpect(jsonPath("$.data.classes", not(empty())))
                .andExpect(jsonPath("$.data.classes[0].types[0].id").isNumber());
    }

    @Test
    void campusRolesSeeEveryActiveTeamWithItsSector() throws Exception {
        var coordinator = fx.account("COORDINADOR");
        var foreman = fx.account("SUPERVISOR");
        long sector = fx.sector();
        long team = fx.team(foreman.id(), sector);

        mvc.perform(get("/api/v1/reports/options").with(as(coordinator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.teams[?(@.id == " + team + ")].sectorId").value(contains((int) sector)));
    }

    @Test
    void supervisorSeesOnlyTheSectorsAndTeamsTheyLead() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        var other = fx.account("SUPERVISOR");
        long own = fx.sector();
        long foreign = fx.sector();
        long ownTeam = fx.team(foreman.id(), own);
        fx.team(other.id(), foreign);
        fx.section(own, "1250.40");

        mvc.perform(get("/api/v1/reports/options").with(as(foreman)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sectors[*].id", contains((int) own)))
                .andExpect(jsonPath("$.data.teams[*].id", contains((int) ownTeam)));
        mvc.perform(get("/api/v1/reports/options/sections").param("sectorId", String.valueOf(own)).with(as(foreman)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].areaM2").value(1250.40));
        mvc.perform(get("/api/v1/reports/options/sections").param("sectorId", String.valueOf(foreign)).with(as(foreman)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/reports/options/sections").param("sectorId", "999999999").with(as(foreman)))
                .andExpect(status().isNotFound());
    }

    @Test
    void supervisorWhoseTeamHasNoSectorGetsNoSectors() throws Exception {
        var foreman = fx.account("SUPERVISOR");
        fx.team(foreman.id(), null);

        mvc.perform(get("/api/v1/reports/options").with(as(foreman)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sectors", empty()))
                .andExpect(jsonPath("$.data.teams", hasSize(1)));
    }

    @Test
    void sectionsOfASectorExcludeSubsectionsAndKeepAMissingArea() throws Exception {
        var admin = fx.account("ADMIN");
        long sector = fx.sector();
        long section = fx.section(sector, "1000");
        long withoutArea = fx.section(sector, null);
        fx.subsection(section);

        mvc.perform(get("/api/v1/reports/options/sections").param("sectorId", String.valueOf(sector)).with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", containsInAnyOrder((int) section, (int) withoutArea)))
                .andExpect(jsonPath("$.data[?(@.id == " + withoutArea + ")].areaM2").value(contains(nullValue())));
    }

    @Test
    void sectionsRequireASector() throws Exception {
        mvc.perform(get("/api/v1/reports/options/sections").with(as(fx.account("ADMIN"))))
                .andExpect(status().isBadRequest());
    }
}
