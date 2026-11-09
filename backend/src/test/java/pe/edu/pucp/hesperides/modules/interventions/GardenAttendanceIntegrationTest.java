package pe.edu.pucp.hesperides.modules.interventions;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenAttendanceProvider;
import pe.edu.pucp.hesperides.modules.planning.attendance.GardenCompletion;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-203 §5.4: la última vez de cada jardín y lo que sigue abierto. */
@Testcontainers
@SpringBootTest
class GardenAttendanceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired GardenAttendanceProvider attendance;

    private long user;
    private long type;
    private long otherType;
    private long sector;
    private long s1;
    private long s2;

    @BeforeEach
    void data() {
        user = jdbc.queryForObject("""
                INSERT INTO users(email,password_hash,first_name,last_name,role_item_id) VALUES (?,'x','T','T',
                (SELECT id FROM catalog_items WHERE code='COORDINADOR' AND catalog_type_id=(SELECT id FROM catalog_types WHERE code='ROLE')))
                RETURNING id""", Long.class, UUID.randomUUID() + "@test.local");
        List<Long> types = jdbc.queryForList("""
                SELECT t.id FROM catalog_items t JOIN catalog_types tt ON tt.id = t.catalog_type_id AND tt.code = 'INTERVENTION_TYPE'
                WHERE t.parent_item_id IS NOT NULL AND t.deleted_at IS NULL ORDER BY t.id LIMIT 2""", Long.class);
        type = types.get(0);
        otherType = types.get(1);
        sector = zone("SECTOR", null);
        s1 = zone("SECTION", sector);
        s2 = zone("SECTION", sector);
    }

    private long item(String type, String code) {
        return jdbc.queryForObject("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = ? AND ci.code = ?""", Long.class, type, code);
    }

    private long zone(String kind, Long parent) {
        String code = "GA-" + UUID.randomUUID().toString().substring(0, 8);
        return jdbc.queryForObject("INSERT INTO zones(code,name,parent_zone_id,zone_type_item_id) VALUES (?,?,?,?) RETURNING id",
                Long.class, code, "Zona " + code, parent, item("ZONE_TYPE", kind));
    }

    private long work(long activity, String planning) {
        return jdbc.queryForObject("""
                INSERT INTO interventions(intervention_class_item_id,intervention_type_item_id,planning_status_item_id,
                    created_by_user_id,scheduled_date,origin_item_id,reported_by_item_id)
                VALUES ((SELECT parent_item_id FROM catalog_items WHERE id=?),?,?,?,DATE '2026-11-05',?,?) RETURNING id""",
                Long.class, activity, activity, item("INTERVENTION_STATUS", planning), user,
                item("INTERVENTION_ORIGIN", "MAINTENANCE"), item("INCIDENT_SOURCE", "NONE"));
    }

    /** {@code startedUtc} y {@code completedUtc} son horas de pared UTC, como las guarda el módulo. */
    private void location(long work, Long zoneId, Long placeId, String status, String startedUtc, String completedUtc) {
        jdbc.update("""
                INSERT INTO intervention_locations(intervention_id,client_reference,zone_id,place_id,status_item_id,
                    started_at,completed_at,executed_by_user_id,location)
                VALUES (?,gen_random_uuid(),?,?,?,?::timestamp,?::timestamp,
                    CASE WHEN ?::timestamp IS NOT NULL THEN ? END, ST_SetSRID(ST_MakePoint(-77.08,-12.07),4326))""",
                work, zoneId, placeId, item("INTERVENTION_STATUS", status), startedUtc, completedUtc, startedUtc, user);
    }

    private long place(long zoneId) {
        return jdbc.queryForObject("""
                INSERT INTO places(name,kind_item_id,category_item_id,zone_id)
                VALUES (?, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                            WHERE ct.code='PLACE_KIND' ORDER BY ci.id LIMIT 1),
                           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                            WHERE ct.code='REFERENCE_CATEGORY' ORDER BY ci.id LIMIT 1), ?) RETURNING id""",
                Long.class, "Lugar " + UUID.randomUUID(), zoneId);
    }

    private List<LocalDate> datesOf(long zone) {
        return attendance.completions(type, List.of(s1, s2)).stream()
                .filter(c -> c.zoneId() == zone).map(GardenCompletion::date).sorted().toList();
    }

    @Test
    void completedCountsWithoutValidationAndValidatedToo() {
        location(work(type, "ASSIGNED"), s1, null, "COMPLETED", "2026-11-01 13:00", "2026-11-01 15:00");
        location(work(type, "ASSIGNED"), s1, null, "VALIDATED", "2026-10-01 13:00", "2026-10-01 15:00");

        assertThat(datesOf(s1)).containsExactly(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 1));
    }

    @Test
    void observedAndInProgressDoNotCount() {
        location(work(type, "ASSIGNED"), s1, null, "OBSERVED", "2026-11-01 13:00", "2026-11-01 15:00");
        location(work(type, "ASSIGNED"), s1, null, "IN_PROGRESS", "2026-11-02 13:00", null);

        assertThat(datesOf(s1)).isEmpty();
    }

    @Test
    void cancelledOrDeletedWorksDoNotCount() {
        location(work(type, "CANCELLED"), s1, null, "COMPLETED", "2026-11-01 13:00", "2026-11-01 15:00");
        long deleted = work(type, "ASSIGNED");
        location(deleted, s1, null, "COMPLETED", "2026-11-02 13:00", "2026-11-02 15:00");
        jdbc.update("UPDATE interventions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", deleted);

        assertThat(datesOf(s1)).isEmpty();
    }

    @Test
    void aPlaceOverTheSectionCountsForItButTheSectorDoesNot() {
        location(work(type, "ASSIGNED"), null, place(s2), "COMPLETED", "2026-11-01 13:00", "2026-11-01 15:00");
        location(work(type, "ASSIGNED"), sector, null, "COMPLETED", "2026-11-03 13:00", "2026-11-03 15:00");

        assertThat(datesOf(s2)).containsExactly(LocalDate.of(2026, 11, 1));
        assertThat(datesOf(s1)).isEmpty();
    }

    @Test
    void lateNightInLimaKeepsItsLocalDate() {
        location(work(type, "ASSIGNED"), s1, null, "COMPLETED", "2026-11-08 02:00", "2026-11-08 04:30");

        assertThat(datesOf(s1)).containsExactly(LocalDate.of(2026, 11, 7));
    }

    @Test
    void anotherActivityDoesNotCount() {
        location(work(otherType, "ASSIGNED"), s1, null, "COMPLETED", "2026-11-01 13:00", "2026-11-01 15:00");

        assertThat(datesOf(s1)).isEmpty();
    }

    @Test
    void openWorksReportTheirFirstStartAndOnlyTheAskedSections() {
        long started = work(type, "ASSIGNED");
        location(started, s1, null, "IN_PROGRESS", "2026-11-05 14:00", null);
        location(started, s2, null, "ASSIGNED", null, null);
        location(work(type, "ASSIGNED"), s2, null, "ASSIGNED", null, null);
        long finished = work(type, "ASSIGNED");
        location(finished, s1, null, "COMPLETED", "2026-11-01 13:00", "2026-11-01 15:00");

        var open = attendance.openWorks(type, List.of(s1, s2));

        assertThat(open).hasSize(2);
        var first = open.stream().filter(w -> w.interventionId() == started).findFirst().orElseThrow();
        assertThat(first.firstStartedDate()).isEqualTo(LocalDate.of(2026, 11, 5));
        assertThat(first.zoneIds()).isEqualTo(Set.of(s1, s2));
        assertThat(open).filteredOn(w -> w.interventionId() != started).singleElement()
                .satisfies(w -> assertThat(w.firstStartedDate()).isNull());
        assertThat(open).noneMatch(w -> w.interventionId() == finished);
        assertThat(attendance.openWorks(type, List.of(s1))).allSatisfy(w -> assertThat(w.zoneIds()).containsOnly(s1));
    }
}
