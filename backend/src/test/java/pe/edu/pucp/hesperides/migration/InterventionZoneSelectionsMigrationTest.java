package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;
import static org.assertj.core.api.Assertions.*;

/** Upgrades only a disposable V034 database, preserving the legacy location verbatim. */
@Testcontainers
class InterventionZoneSelectionsMigrationTest {
    @Container static PostgreSQLContainer<?> postgres=TestDatabase.newContainer();
    @Test void upgradePreservesLegacyDataAndDoesNotInventAssociations() {
        var source=new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword());
        var jdbc=new JdbcTemplate(source);
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("48").load().migrate();
        jdbc.update("""
            INSERT INTO interventions(intervention_class_item_id,planning_status_item_id,created_by_user_id,
                scheduled_date,origin_item_id,reported_by_item_id,description)
            SELECT (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_CLASS' ORDER BY i.id LIMIT 1),
                (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_STATUS' AND i.code='PLANNED'),
                (SELECT id FROM users ORDER BY id LIMIT 1),DATE '2026-10-01',
                (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INTERVENTION_ORIGIN' AND i.code='MAINTENANCE'),
                (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='INCIDENT_SOURCE' AND i.code='NONE'),'Legacy work'
            """);
        jdbc.update("""
            INSERT INTO intervention_locations(intervention_id,client_reference,status_item_id,location,
                unit_item_id,requested_quantity,progress_quantity,execution_notes)
            SELECT id,gen_random_uuid(),planning_status_item_id,ST_SetSRID(ST_MakePoint(-77.1,-12.1),4326),
                (SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='MEASUREMENT_UNIT' AND i.code='UNIT'),
                4.125,2.750,'Legacy progress remains in original units' FROM interventions
            """);
        String before=jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(l) ORDER BY id)::text FROM intervention_locations l",String.class);
        String places=jdbc.queryForObject("SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id),'[]')::text FROM places p",String.class);
        String zones=jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(z) ORDER BY id)::text FROM zones z",String.class);
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("49").load().migrate();
        String locations35=jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(l) ORDER BY id)::text FROM intervention_locations l",String.class);
        String interventions35=jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM interventions i",String.class);
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        assertThat(jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(l) ORDER BY id)::text FROM intervention_locations l",String.class)).isEqualTo(locations35);
        assertThat(jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(i)-'campus_selection_revision' ORDER BY id)::text FROM interventions i",String.class)).isEqualTo(interventions35);
        assertThat(jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(l)-'zone_selection_revision'-'zone_boundary_snapshot' ORDER BY id)::text FROM intervention_locations l",String.class)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id),'[]')::text FROM places p",String.class)).isEqualTo(places);
        assertThat(jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(z) ORDER BY id)::text FROM zones z",String.class)).isEqualTo(zones);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_reviews",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM intervention_place_zone_links",Integer.class)).isZero();
        assertThatThrownBy(()->jdbc.update("UPDATE intervention_locations SET zone_selection_revision=repeat('a',64)"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
