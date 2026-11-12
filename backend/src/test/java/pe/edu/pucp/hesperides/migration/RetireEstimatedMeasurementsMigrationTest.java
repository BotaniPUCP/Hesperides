package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-105 §4.1: an estimate saved as a real measurement must not survive the upgrade. */
@Testcontainers
class RetireEstimatedMeasurementsMigrationTest {

    private static final String LAST_VERSION_WITH_ESTIMATES = "029";
    private static final String RESTORED_SPECIMEN = "EV-000001";
    private static final String ONLY_ESTIMATED_SPECIMEN = "EV-000002";
    private static final String UNTOUCHED_SPECIMEN = "EV-000003";
    private static final String ESTIMATE_NOTE = "Estimación por labor técnica tras INT-000001 (Poda).";
    private static final LocalDate SEEDED_DATE = LocalDate.of(2026, 1, 1);
    private static final LocalDate ESTIMATE_DATE = LocalDate.of(2026, 3, 1);

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate jdbc;

    @BeforeAll
    static void upgradeDatabaseHoldingEstimates() {
        flyway().target(LAST_VERSION_WITH_ESTIMATES).load().migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));

        jdbc.update("""
                UPDATE green_element_measurements SET deleted_at = CURRENT_TIMESTAMP
                 WHERE green_element_id = (SELECT id FROM green_elements WHERE code = ?)""", ONLY_ESTIMATED_SPECIMEN);
        saveEstimate(RESTORED_SPECIMEN);
        saveEstimate(ONLY_ESTIMATED_SPECIMEN);

        flyway().load().migrate();
    }

    private static org.flywaydb.core.api.configuration.FluentConfiguration flyway() {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    /** Writes exactly what the retired service wrote: a history row and the current values as MEASURED. */
    private static void saveEstimate(String code) {
        jdbc.update("""
                INSERT INTO green_element_measurements
                    (green_element_id, measured_at, height_m, trunk_height_m, dbh_cm, crown_radius_m, is_banded, notes)
                SELECT id, ?, 1.11, 1.00, 99.0, 0.99, FALSE, ? FROM green_elements WHERE code = ?""",
                Date.valueOf(ESTIMATE_DATE), ESTIMATE_NOTE, code);
        jdbc.update("""
                UPDATE green_elements
                   SET height_m = 1.11, trunk_height_m = 1.00, dbh_cm = 99.0, crown_radius_m = 0.99, is_banded = FALSE,
                       data_source = 'MEASURED', measured_at = ?
                 WHERE code = ?""", Date.valueOf(ESTIMATE_DATE), code);
    }

    private static Map<String, Object> current(String code) {
        return jdbc.queryForMap("""
                SELECT height_m, trunk_height_m, dbh_cm, crown_radius_m, is_banded, data_source, measured_at
                  FROM green_elements WHERE code = ?""", code);
    }

    @Test
    void specimenReturnsToItsLastRealMeasurement() {
        var specimen = current(RESTORED_SPECIMEN);

        assertThat((BigDecimal) specimen.get("height_m")).isEqualByComparingTo("7.5");
        assertThat((BigDecimal) specimen.get("trunk_height_m")).isEqualByComparingTo("6.0");
        assertThat((BigDecimal) specimen.get("dbh_cm")).isEqualByComparingTo("150.0");
        assertThat((BigDecimal) specimen.get("crown_radius_m")).isEqualByComparingTo("3.4");
        assertThat(specimen.get("is_banded")).isEqualTo(true);
        assertThat(specimen.get("data_source")).isEqualTo("MEASURED");
        assertThat(((Date) specimen.get("measured_at")).toLocalDate()).isEqualTo(SEEDED_DATE);
    }

    @Test
    void specimenWithoutRealMeasurementBecomesUnknown() {
        var specimen = current(ONLY_ESTIMATED_SPECIMEN);

        assertThat(specimen.get("height_m")).isNull();
        assertThat(specimen.get("trunk_height_m")).isNull();
        assertThat(specimen.get("dbh_cm")).isNull();
        assertThat(specimen.get("crown_radius_m")).isNull();
        assertThat(specimen.get("measured_at")).isNull();
        assertThat(specimen.get("data_source")).isEqualTo("UNKNOWN");
    }

    @Test
    void specimenWithoutEstimatesIsNotTouched() {
        var specimen = current(UNTOUCHED_SPECIMEN);

        assertThat((BigDecimal) specimen.get("height_m")).isEqualByComparingTo("7.5");
        assertThat((BigDecimal) specimen.get("dbh_cm")).isEqualByComparingTo("192.0");
        assertThat(specimen.get("data_source")).isEqualTo("MEASURED");
    }

    @Test
    void estimatesLeaveTheActiveHistoryButAreKept() {
        Integer active = jdbc.queryForObject("""
                SELECT count(*) FROM green_element_measurements
                 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NULL""", Integer.class);
        Integer kept = jdbc.queryForObject("""
                SELECT count(*) FROM green_element_measurements
                 WHERE notes LIKE 'Estimación por labor técnica%' AND deleted_at IS NOT NULL""", Integer.class);

        assertThat(active).isZero();
        assertThat(kept).isEqualTo(2);
    }

    @Test
    void realMeasurementRemainsActiveInTheHistory() {
        Integer active = jdbc.queryForObject("""
                SELECT count(*) FROM green_element_measurements m
                  JOIN green_elements g ON g.id = m.green_element_id
                 WHERE g.code = ? AND m.deleted_at IS NULL""", Integer.class, RESTORED_SPECIMEN);

        assertThat(active).isEqualTo(1);
    }
}
