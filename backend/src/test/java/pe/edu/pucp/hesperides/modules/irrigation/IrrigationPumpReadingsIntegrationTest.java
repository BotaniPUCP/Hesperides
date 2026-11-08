package pe.edu.pucp.hesperides.modules.irrigation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class IrrigationPumpReadingsIntegrationTest {
    private static final String PATH = "/api/v1/irrigation/pump-readings";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clearSettings() {
        settings("", "");
    }

    @Test
    void calculatesVolumeAndKeepsTheLimitsUsedAtRegistration() throws Exception {
        settings("12.5", "3");
        Account supervisor = account("SUPERVISOR");
        mvc.perform(post(PATH).with(supervisor.principal()).contentType(MediaType.APPLICATION_JSON)
                .content(reading("2026-11-02", "100.25", "104.25", "65")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.recordedByUserId").value(supervisor.id()))
            .andExpect(jsonPath("$.data.operationHours").value(4.0))
            .andExpect(jsonPath("$.data.estimatedVolumeM3").value(50.0))
            .andExpect(jsonPath("$.data.exceedsDailyLimit").value(true));

        settings("20", "5");
        mvc.perform(get(PATH).with(account("COORDINADOR").principal()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.dailyLimitHours").value(5))
            .andExpect(jsonPath("$.data.readings[?(@.readingDate == '2026-11-02' && @.dailyLimitHours == 3 && @.exceedsDailyLimit == true)]").isNotEmpty());
    }

    @Test
    void checksConfigurationAndRejectsInconsistentReadings() throws Exception {
        var supervisor = account("SUPERVISOR").principal();
        mvc.perform(post(PATH).with(supervisor).contentType(MediaType.APPLICATION_JSON)
                .content(reading("2026-11-03", "10", "12", "60")))
            .andExpect(status().isBadRequest());
        settings("10", "3");
        for (String body : new String[] { reading("2026-11-03", "12", "10", "60"),
                reading("2026-11-03", "10", "35", "60"), reading("2026-11-03", "10", "12", "101") }) {
            mvc.perform(post(PATH).with(supervisor).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        }
    }

    @Test
    void preventsDuplicateDailyReadingsAndUsesTheSupervisorWritePermission() throws Exception {
        settings("10", "3");
        var supervisor = account("SUPERVISOR").principal();
        String body = reading("2026-11-04", "100", "103", "75");
        mvc.perform(post(PATH).with(supervisor).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.exceedsDailyLimit").value(false));
        mvc.perform(post(PATH).with(supervisor).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict());
        for (String role : new String[] { "ADMIN", "COORDINADOR", "OPERARIO" }) {
            mvc.perform(post(PATH).with(account(role).principal()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        }
        mvc.perform(get(PATH).with(account("OPERARIO").principal())).andExpect(status().isForbidden());
    }

    private void settings(String flow, String limit) {
        jdbc.update("UPDATE system_parameters SET value = ? WHERE code = 'IRRIGATION_PUMP_FLOW_M3_PER_HOUR'", flow);
        jdbc.update("UPDATE system_parameters SET value = ? WHERE code = 'IRRIGATION_PUMP_DAILY_LIMIT_HOURS'", limit);
    }

    private Account account(String role) {
        String email = UUID.randomUUID() + "@example.test";
        Long id = jdbc.queryForObject("""
            INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
            SELECT ?, 'unused', 'Pump', 'Test', ci.id FROM catalog_items ci
            JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'ROLE' AND ci.code = ?
            RETURNING id
            """, Long.class, email, role);
        return new Account(id, user(email).authorities(new SimpleGrantedAuthority(role)));
    }

    private static String reading(String date, String initial, String end, String level) {
        return """
            {"readingDate":"%s","initialMeterHours":%s,"finalMeterHours":%s,"reservoirLevelPercent":%s}
            """.formatted(date, initial, end, level);
    }

    private record Account(Long id, RequestPostProcessor principal) {}
}
