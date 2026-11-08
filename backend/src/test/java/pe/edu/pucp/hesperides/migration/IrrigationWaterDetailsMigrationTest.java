package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
class IrrigationWaterDetailsMigrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @Test
    void preservesLegacyTurnsAndAddsTheWaterCatalogs() {
        var dataSource = new DriverManagerDataSource(
            postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
        Flyway.configure().dataSource(dataSource).target("034").load().migrate();
        var jdbc = new JdbcTemplate(dataSource);
        Long turnId = jdbc.queryForObject("""
            INSERT INTO irrigation_turns (sector_zone_id, supervisor_user_id, irrigation_date, notes)
            SELECT z.id, u.id, DATE '2026-11-05', 'Turno anterior'
            FROM zones z CROSS JOIN users u
            WHERE z.code = 'SEC-VERDE-01' AND u.email = 'admin@pucp.edu.pe'
            RETURNING id
            """, Long.class);

        Flyway.configure().dataSource(dataSource).load().migrate();

        assertThat(jdbc.queryForMap("""
            SELECT notes, water_source_item_id, irrigation_method_item_id, tanker_trips, tanker_volume_m3,
                   window_exception_item_id
            FROM irrigation_turns WHERE id = ?
            """, turnId))
            .containsEntry("notes", "Turno anterior")
            .containsEntry("water_source_item_id", null)
            .containsEntry("irrigation_method_item_id", null)
            .containsEntry("tanker_trips", null)
            .containsEntry("tanker_volume_m3", null)
            .containsEntry("window_exception_item_id", null);
        assertThat(jdbc.queryForList("""
            SELECT ct.code || ':' || ci.code
            FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code IN ('IRRIGATION_WATER_SOURCE', 'IRRIGATION_METHOD') AND ci.is_active
            """, String.class)).containsExactlyInAnyOrder(
                "IRRIGATION_WATER_SOURCE:NETWORK", "IRRIGATION_WATER_SOURCE:TANKER", "IRRIGATION_WATER_SOURCE:WELL",
                "IRRIGATION_METHOD:SPRINKLER", "IRRIGATION_METHOD:HOSE", "IRRIGATION_METHOD:DRIP");
        assertThatThrownBy(() -> jdbc.update("UPDATE irrigation_turns SET tanker_trips = 1 WHERE id = ?", turnId))
            .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("""
            SELECT value FROM system_parameters WHERE code = 'IRRIGATION_OPERATING_WINDOW'
            """, String.class)).isEqualTo("06:30-11:30");
        assertThat(jdbc.queryForList("""
            SELECT ci.code FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'IRRIGATION_WINDOW_EXCEPTION' AND ci.is_active
            """, String.class)).containsExactlyInAnyOrder("EMERGENCY", "SPECIAL_AUTHORIZATION");
    }
}
