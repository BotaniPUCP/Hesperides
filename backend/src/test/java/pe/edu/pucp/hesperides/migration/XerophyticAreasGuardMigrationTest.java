package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SPEC-102 §4.3, enmienda del 15 nov 2026: V063 solo reemplaza un jardín por su xerofítica si siguen siendo el mismo
 * polígono. Si alguien ya movió uno, falla diciendo cuál y no toca nada (fail fast).
 */
@Testcontainers
class XerophyticAreasGuardMigrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @Test
    void siUnParYaNoCoincideFallaDiciendoCualYNoTocaNada() {
        JdbcTemplate db = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway(db, "62").migrate();
        db.update("UPDATE zones SET boundary = ST_Translate(boundary, 0.0001, 0) WHERE code = 'XE-0002'");

        assertThatThrownBy(() -> flyway(db, "63").migrate()).isInstanceOf(FlywayException.class).hasMessageContaining("XE-0002");
        assertThat(db.queryForObject("SELECT count(*) FROM zones WHERE code = 'AV-0253' AND deleted_at IS NULL", Long.class)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT parent_zone_id FROM zones WHERE code = 'XE-0001'", Long.class)).isNull();
    }

    private static Flyway flyway(JdbcTemplate db, String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }
}
