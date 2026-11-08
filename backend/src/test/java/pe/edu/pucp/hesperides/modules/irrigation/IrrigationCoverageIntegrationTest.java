package pe.edu.pucp.hesperides.modules.irrigation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
@Import(IrrigationCoverageIntegrationTest.FixedClock.class)
class IrrigationCoverageIntegrationTest {
    private static final String COVERAGE = "/api/v1/irrigation/coverage";
    private static final String ADMIN_EMAIL = "admin@pucp.edu.pe";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean @Primary
        Clock coverageClock() {
            return Clock.fixed(Instant.parse("2026-11-09T01:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @Test
    void weightsUniqueRegisteredSectionsAndRefreshesAfterCreatingATurn() throws Exception {
        jdbc.update("UPDATE zones SET is_active = false");
        long sector = zone("PILOT-A", "SECTOR", null, null, null);
        long other = zone("PILOT-B", "SECTOR", null, null, null);
        long wet = zone("PILOT-WET", "SECTION", sector, 60, "GREEN_AREA");
        long previousMonth = zone("PILOT-OLD", "SECTION", sector, 40, "GREEN_AREA");
        long missingArea = zone("PILOT-UNKNOWN", "SECTION", sector, null, "GREEN_AREA");
        long otherSection = zone("PILOT-OTHER", "SECTION", other, 100, "GREEN_AREA");
        zone("PILOT-XERO", "SECTION", sector, 999, "XEROPHYTIC");
        long inactiveSector = zone("PILOT-INACTIVE", "SECTOR", null, null, null);
        zone("PILOT-OUTSIDE", "SECTION", inactiveSector, 999, "GREEN_AREA");
        jdbc.update("UPDATE zones SET is_active = false WHERE id = ?", inactiveSector);

        turn(sector, previousMonth, "2026-10-31", false);
        turn(sector, previousMonth, "2026-11-02", true);
        turn(sector, otherSection, "2026-11-02", false);
        turn(other, otherSection, "2026-11-09", false);
        turn(sector, missingArea, "2026-11-01", false);
        jdbc.update("UPDATE system_parameters SET value = '8' WHERE code = 'IRRIGATION_COVERAGE_MAX_DAYS'");

        mvc.perform(get(COVERAGE).with(principal("ADMIN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.monthStart").value("2026-11-01"))
            .andExpect(jsonPath("$.data.asOf").value("2026-11-08"))
            .andExpect(jsonPath("$.data.measuredAreaM2").value(200.0))
            .andExpect(jsonPath("$.data.coveragePercent").isEmpty())
            .andExpect(jsonPath("$.data.maxDaysWithoutIrrigation").value(8));

        mvc.perform(post("/api/v1/irrigation/turns").with(principal("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sectorZoneId":%d,"irrigationDate":"2026-11-08","sectionZoneIds":[%d]}
                    """.formatted(sector, wet)))
            .andExpect(status().isCreated());
        turn(sector, wet, "2026-11-03", false);

        mvc.perform(get(COVERAGE).with(principal("COORDINADOR")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.irrigatedAreaM2").value(60.0))
            .andExpect(jsonPath("$.data.coveragePercent").value(30.0))
            .andExpect(jsonPath("$.data.sections.length()").value(4))
            .andExpect(jsonPath("$.data.sections[0].code").value("PILOT-OTHER"))
            .andExpect(jsonPath("$.data.sections[0].lastIrrigatedOn").isEmpty())
            .andExpect(jsonPath("$.data.sections[1].daysWithoutIrrigation").value(8));
        mvc.perform(get(COVERAGE).with(principal("SUPERVISOR"))).andExpect(status().isOk());
        mvc.perform(get(COVERAGE).with(principal("OPERARIO"))).andExpect(status().isForbidden());
    }

    private Long zone(String code, String type, Long parent, Integer area, String landscape) {
        return jdbc.queryForObject("""
            INSERT INTO zones (code, name, zone_type_item_id, parent_zone_id, area_m2, landscape_type_item_id)
            VALUES (?, ?, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                           WHERE ct.code = 'ZONE_TYPE' AND ci.code = ?), ?, ?,
                           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                            WHERE ct.code = 'LANDSCAPE_TYPE' AND ci.code = ?))
            RETURNING id
            """, Long.class, code, code, type, parent, area, landscape);
    }

    private void turn(long sector, long section, String date, boolean deletedLink) {
        Long turnId = jdbc.queryForObject("""
            INSERT INTO irrigation_turns (sector_zone_id, supervisor_user_id, irrigation_date)
            VALUES (?, (SELECT id FROM users WHERE email = ? AND deleted_at IS NULL), ?) RETURNING id
            """, Long.class, sector, ADMIN_EMAIL, LocalDate.parse(date));
        jdbc.update("""
            INSERT INTO irrigation_turn_sections (turn_id, section_zone_id, deleted_at)
            VALUES (?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
            """, turnId, section, deletedLink);
    }

    private static RequestPostProcessor principal(String role) {
        return user(ADMIN_EMAIL).authorities(new SimpleGrantedAuthority(role));
    }
}
