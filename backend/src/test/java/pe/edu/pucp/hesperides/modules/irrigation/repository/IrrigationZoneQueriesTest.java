package pe.edu.pucp.hesperides.modules.irrigation.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;

import static org.assertj.core.api.Assertions.assertThat;

class IrrigationZoneQueriesTest {
    private EmbeddedDatabase database;
    private IrrigationZoneQueries zones;

    @BeforeEach
    void createCatalog() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        JdbcTemplate jdbc = new JdbcTemplate(database);
        zones = new IrrigationZoneQueries(jdbc);
        jdbc.execute("CREATE TABLE catalog_types (id BIGINT PRIMARY KEY, code VARCHAR(20))");
        jdbc.execute("CREATE TABLE catalog_items (id BIGINT PRIMARY KEY, catalog_type_id BIGINT, code VARCHAR(20))");
        jdbc.execute("""
            CREATE TABLE zones (id BIGINT PRIMARY KEY, code VARCHAR(20), name VARCHAR(40), zone_type_item_id BIGINT,
                parent_zone_id BIGINT, is_active BOOLEAN, deleted_at TIMESTAMP)
            """);
        jdbc.execute("""
            CREATE TABLE irrigation_turn_sections (id BIGINT PRIMARY KEY, turn_id BIGINT, section_zone_id BIGINT,
                deleted_at TIMESTAMP)
            """);
        jdbc.update("INSERT INTO catalog_types VALUES (1, 'ZONE_TYPE'), (2, 'OTHER')");
        jdbc.update("INSERT INTO catalog_items VALUES (1, 1, 'SECTOR'), (2, 1, 'SECTION'), (3, 2, 'SECTOR')");
        jdbc.update("""
            INSERT INTO zones VALUES
                (10, 'A', 'Sector A', 1, NULL, TRUE, NULL),
                (20, 'B', 'Sector B', 1, NULL, FALSE, NULL),
                (30, 'C', 'Sector C', 1, NULL, TRUE, CURRENT_TIMESTAMP),
                (40, 'D', 'Sector D', 3, NULL, TRUE, NULL),
                (50, 'E', 'Sector E', 1, NULL, TRUE, NULL),
                (11, 'A-1', 'Sección A', 2, 10, TRUE, NULL),
                (12, 'A-2', 'Sección B', 2, 10, TRUE, NULL),
                (13, 'A-3', 'Sección Inactiva', 2, 10, FALSE, NULL),
                (14, 'A-4', 'Sección Retirada', 2, 10, TRUE, CURRENT_TIMESTAMP),
                (15, 'A-5', 'Sección Trasladada', 2, 50, TRUE, NULL),
                (16, 'A-6', 'Sección C', 2, 10, TRUE, NULL)
            """);
        jdbc.update("""
            INSERT INTO irrigation_turn_sections VALUES (1, 100, 11, NULL), (2, 100, 13, NULL), (3, 100, 14, NULL),
                (4, 100, 15, NULL), (5, 100, 16, CURRENT_TIMESTAMP), (6, 101, 12, NULL)
            """);
    }

    @AfterEach
    void closeDatabase() {
        database.shutdown();
    }

    @Test
    void catalogOnlyIncludesActiveSectorsAndSections() {
        assertThat(zones.sectors()).extracting(IrrigationZoneResponse::id).containsExactly(10L, 50L);
        assertThat(zones.sectionsOf(10L)).extracting(IrrigationZoneResponse::id).containsExactly(11L, 12L, 16L);
        assertThat(zones.sectionsOf(50L)).extracting(IrrigationZoneResponse::id).containsExactly(15L);
    }

    @Test
    void historyRetainsRecordedSectionsAfterCatalogChanges() {
        assertThat(zones.recordedSections(100L)).extracting(IrrigationZoneResponse::id)
            .containsExactly(11L, 13L, 14L, 15L);
        assertThat(zones.recordedSections(101L)).extracting(IrrigationZoneResponse::id).containsExactly(12L);
    }
}
