package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportFilter;
import pe.edu.pucp.hesperides.modules.reports.service.ReportsService;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** The dev-only demo data of SPEC-202: applied after the incidents demo, idempotent and readable by the reports. */
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.pe.edu.pucp.hesperides=INFO"})
@ActiveProfiles("dev")
@Testcontainers
@Transactional
class DemoReportsSeedTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ReportsService reports;

    @Test
    @WithMockUser(username = "coordinador@demo.invalid", authorities = "COORDINADOR")
    void seedRunsAfterTheIncidentsDemoIsIdempotentAndFeedsTheMonthlyReport() throws Exception {
        assertThat(jdbc.queryForObject("""
                SELECT r.installed_rank > i.installed_rank FROM flyway_schema_history r, flyway_schema_history i
                WHERE r.script = 'R__seed_demo_reports.sql' AND r.success
                  AND i.script = 'R__seed_demo_incidents.sql' AND i.success
                """, Boolean.class)).isTrue();
        assertThat(sectorOfTeam("DEMO-INC-1")).isEqualTo("SEC-VERDE-02");
        assertThat(sectorOfTeam("DEMO-INC-2")).isNull();
        assertCounts();

        jdbc.execute(new ClassPathResource("db/dev-migration/R__seed_demo_reports.sql")
                .getContentAsString(StandardCharsets.UTF_8));
        assertCounts();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM teams", Long.class)).isEqualTo(2);

        long sector = jdbc.queryForObject("SELECT id FROM zones WHERE code = 'SEC-VERDE-02'", Long.class);
        DateRange previous = ReportPeriods.month(ReportPeriods.lastClosedMonth(LocalDate.now()));
        var report = reports.monthly(new MonthlyReportFilter(previous.from(), previous.to(), sector,
                null, null, null, null), "coordinador@demo.invalid");
        // Sections 6, 7 and 8 of the sector are attended in the previous month.
        assertThat(report.coverage().coveredSections()).isGreaterThanOrEqualTo(3);
        assertThat(report.compliance()).anySatisfy(row -> assertThat(row.notEvaluableReason()).isEqualTo("OUTSOURCED"));
        // SPEC-203 §3.4: the irrigation demo rule for sets is assigned to the sector's set, once.
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM planning_assignments pa
                JOIN green_area_sets s ON s.id = pa.set_id AND s.deleted_at IS NULL
                JOIN maintenance_frequencies f ON f.rule_key = pa.frequency_rule_key AND f.scope = 'BY_SET'
                  AND f.deleted_at IS NULL AND f.valid_to IS NULL
                WHERE pa.deleted_at IS NULL
                """, Long.class)).isEqualTo(1);

        assertThat(reports.options("capataz@demo.invalid").sectors())
                .extracting(s -> s.code()).containsExactly("SEC-VERDE-02");
        assertThat(reports.options("otro-capataz@demo.invalid").sectors()).isEmpty();
    }

    private void assertCounts() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM interventions WHERE external_code LIKE 'DEMO-REP-%'",
                Long.class)).isEqualTo(12);
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM intervention_locations l JOIN interventions i ON i.id = l.intervention_id
                WHERE i.external_code LIKE 'DEMO-REP-%'
                """, Long.class)).isEqualTo(14);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM maintenance_frequencies WHERE notes LIKE '%SPEC-202%'",
                Long.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_evidences WHERE storage_key LIKE 'demo/spec-202/%'",
                Long.class)).isEqualTo(1);
    }

    private String sectorOfTeam(String code) {
        return jdbc.queryForObject("SELECT z.code FROM teams t LEFT JOIN zones z ON z.id = t.zone_id WHERE t.code = ?",
                String.class, code);
    }
}
