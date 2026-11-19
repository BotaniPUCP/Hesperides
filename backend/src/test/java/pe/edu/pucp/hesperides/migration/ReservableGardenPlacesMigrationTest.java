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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every reservable garden is a place, so a loan can be found by any of the names the OSG calendar uses.
 * A place someone already created for one of those gardens is kept, not duplicated.
 */
@Testcontainers
class ReservableGardenPlacesMigrationTest {

    private static final String LAST_VERSION_WITHOUT_GARDEN_PLACES = "034";
    private static final String ZONE_WITH_EXISTING_PLACE = "AV-0358";
    private static final int RESERVABLE_GARDENS = 19;

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate jdbc;

    @BeforeAll
    static void upgradeDatabaseWithOneGardenAlreadyAPlace() {
        flyway().target(LAST_VERSION_WITHOUT_GARDEN_PLACES).load().migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        jdbc.update("""
                INSERT INTO places (name, kind_item_id, category_item_id, zone_id)
                SELECT 'Jardín del comedor', k.id, c.id, z.id FROM catalog_items k, catalog_items c, zones z
                 WHERE k.code = 'OUTDOOR' AND c.code = 'AREA_VERDE' AND z.code = ?""", ZONE_WITH_EXISTING_PLACE);

        flyway().load().migrate();
    }

    private static org.flywaydb.core.api.configuration.FluentConfiguration flyway() {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private static List<String> aliasesOf(String placeName) {
        return jdbc.queryForList("""
                SELECT a.alias FROM place_aliases a JOIN places p ON p.id = a.place_id
                 WHERE p.name = ? AND p.deleted_at IS NULL AND a.deleted_at IS NULL""", String.class, placeName);
    }

    @Test
    void everyReservableZoneHasALivePlace() {
        List<String> withoutPlace = jdbc.queryForList("""
                SELECT z.code FROM zones z
                 WHERE z.is_reservable AND z.deleted_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM places p WHERE p.zone_id = z.id AND p.deleted_at IS NULL)""",
                String.class);

        assertThat(withoutPlace).isEmpty();
    }

    @Test
    void theNineteenGardensAreTopLevelGreenAreaPlaces() {
        Integer gardens = jdbc.queryForObject("""
                SELECT count(*) FROM places p
                  JOIN catalog_items c ON c.id = p.category_item_id AND c.code = 'AREA_VERDE'
                  JOIN catalog_items k ON k.id = p.kind_item_id AND k.code = 'OUTDOOR'
                 WHERE p.parent_place_id IS NULL AND p.deleted_at IS NULL""", Integer.class);

        assertThat(gardens).isEqualTo(RESERVABLE_GARDENS);
    }

    @Test
    void aPlaceAlreadyCreatedForAGardenIsNotDuplicated() {
        List<String> names = jdbc.queryForList("""
                SELECT p.name FROM places p JOIN zones z ON z.id = p.zone_id
                 WHERE z.code = ? AND p.deleted_at IS NULL""", String.class, ZONE_WITH_EXISTING_PLACE);

        assertThat(names).containsExactly("Jardín del comedor");
    }

    @Test
    void theCalendarNamesThatDifferAreAliases() {
        assertThat(aliasesOf("Jardín Pabellón H")).containsExactly("Jardin H");
        assertThat(aliasesOf("Jardín Rosales")).containsExactly("Jardín ROSALES (FARES)");
    }

    @Test
    void theTwoPalmerasPolygonsAreOneGardenTakingTheOutlineOfItsParts() {
        List<String> parts = jdbc.queryForList("""
                SELECT z.code FROM places child
                  JOIN places parent ON parent.id = child.parent_place_id
                  JOIN zones z ON z.id = child.zone_id
                 WHERE parent.name = 'Jardín Palmeras (Gastronomía)' AND parent.outline_from_children
                   AND child.deleted_at IS NULL ORDER BY z.code""", String.class);

        assertThat(parts).containsExactly("AV-0481", "AV-0482");
    }

    @Test
    void theFisicaGardenIsLentByTheDaf() {
        String owner = jdbc.queryForObject("""
                SELECT o.code FROM zones z JOIN catalog_items o ON o.id = z.reservation_owner_item_id
                 WHERE z.code = 'AV-0475'""", String.class);

        assertThat(owner).isEqualTo("DAF");
    }
}
