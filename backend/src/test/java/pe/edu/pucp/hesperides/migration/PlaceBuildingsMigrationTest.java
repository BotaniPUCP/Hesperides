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
 * A place used to hold one building in a column; the upgrade copies it to the list without losing its outline,
 * and keeps the column so a branch that still reads it can run on the upgraded database.
 */
@Testcontainers
class PlaceBuildingsMigrationTest {

    private static final String LAST_VERSION_WITH_ONE_BUILDING = "033";
    private static final String INRAS_REF = "way/615391653";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate jdbc;
    private static long buildingPlaceId;
    private static long drawnPlaceId;
    private static long deletedPlaceId;
    private static long inrasId;

    @BeforeAll
    static void upgradeDatabaseWithSingleBuildingPlaces() {
        flyway().target(LAST_VERSION_WITH_ONE_BUILDING).load().migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        inrasId = jdbc.queryForObject("SELECT id FROM campus_buildings WHERE source_ref = ?", Long.class, INRAS_REF);

        buildingPlaceId = insertPlace("INRAS", "building_id", inrasId, null);
        drawnPlaceId = insertPlace("Punto", "own_geometry", null, "SRID=4326;POINT(-77.08 -12.07)");
        deletedPlaceId = insertPlace("Borrado", "building_id", inrasId, null);
        jdbc.update("UPDATE places SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", deletedPlaceId);

        flyway().load().migrate();
    }

    private static org.flywaydb.core.api.configuration.FluentConfiguration flyway() {
        return Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private static long insertPlace(String name, String column, Long buildingId, String ewkt) {
        String value = buildingId != null ? buildingId.toString() : "ST_GeomFromEWKT('" + ewkt + "')";
        return jdbc.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, %s)
                SELECT ?, k.id, c.id, %s FROM catalog_items k, catalog_items c
                 WHERE k.code = 'OUTDOOR' AND c.code = 'EDIFICIO' RETURNING id""".formatted(column, value),
                Long.class, name);
    }

    private static List<Long> buildingsOf(long placeId) {
        return jdbc.queryForList("SELECT building_id FROM place_buildings WHERE place_id = ? AND deleted_at IS NULL",
                Long.class, placeId);
    }

    @Test
    void theBuildingOfAPlaceMovesToItsList() {
        assertThat(buildingsOf(buildingPlaceId)).containsExactly(inrasId);
    }

    @Test
    void theOutlineIsStillTheBuildingFootprint() {
        Boolean same = jdbc.queryForObject("""
                SELECT ST_Equals(o.geom, b.footprint) FROM place_outlines o, campus_buildings b
                 WHERE o.place_id = ? AND b.id = ?""", Boolean.class, buildingPlaceId, inrasId);

        assertThat(same).isTrue();
    }

    @Test
    void aPlaceWithoutBuildingGetsNoList() {
        assertThat(buildingsOf(drawnPlaceId)).isEmpty();
    }

    @Test
    void aDeletedPlaceDoesNotKeepItsBuilding() {
        assertThat(buildingsOf(deletedPlaceId)).isEmpty();
    }

    @Test
    void theOldColumnKeepsItsBuildingForBranchesThatStillReadIt() {
        Long kept = jdbc.queryForObject("SELECT building_id FROM places WHERE id = ?", Long.class, buildingPlaceId);

        assertThat(kept).isEqualTo(inrasId);
    }

    @Test
    void aPlaceSavedTheOldWayAfterTheUpgradeStillHasItsOutline() {
        long savedByOldCode = insertPlace("Guardado por una rama anterior", "building_id", inrasId, null);

        Boolean same = jdbc.queryForObject("""
                SELECT ST_Equals(o.geom, b.footprint) FROM place_outlines o, campus_buildings b
                 WHERE o.place_id = ? AND b.id = ?""", Boolean.class, savedByOldCode, inrasId);

        assertThat(same).isTrue();
    }
}
