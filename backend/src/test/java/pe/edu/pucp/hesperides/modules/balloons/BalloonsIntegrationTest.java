package pe.edu.pucp.hesperides.modules.balloons;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-113 §5.1 y CA-01 a CA-06, CA-09: cada fuente aporta solo lo que debe. El reloj es mié 4 nov 2026, 10:00 en Lima. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(BalloonsIntegrationTest.FixedClock.class)
class BalloonsIntegrationTest {

    static final Instant NOW = Instant.parse("2026-11-04T15:00:00Z");
    static final PostgreSQLContainer<?> POSTGRES = TestDatabase.newContainer();
    private static final java.util.concurrent.atomic.AtomicInteger NEXT_PLACE = new java.util.concurrent.atomic.AtomicInteger();

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedBalloonsClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    private final ObjectMapper json = new ObjectMapper();

    private long sector;
    private long section;
    private long other;
    private long userId;
    private long team;
    private double lon;

    @BeforeEach
    void sectorWithTwoGardens() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        // Cada prueba dibuja sus jardines lejos de los de las demás y del campus real; con un sorteo,
        // dos pruebas podían caer en el mismo sitio y llevarse una el globo de la otra.
        lon = -70.0 - NEXT_PLACE.incrementAndGet() * 0.05;
        sector = zone("SECTOR", null, "S-" + tag, null);
        section = zone("SECTION", sector, "A-" + tag, lon);
        other = zone("SECTION", sector, "B-" + tag, lon + 0.01);
        userId = jdbc.queryForObject("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT ?, 'x', 'Carlos', 'Capataz', i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = 'SUPERVISOR' RETURNING id""", Long.class, "c-" + tag + "@test.local");
        team = jdbc.queryForObject("INSERT INTO teams(code, name, supervisor_user_id, zone_id) VALUES (?,?,?,?) RETURNING id",
                Long.class, "T-" + tag, "Cuadrilla " + tag, userId, sector);
    }

    private long zone(String type, Long parent, String code, Double atLon) {
        return jdbc.queryForObject("""
                INSERT INTO zones (code, name, parent_zone_id, zone_type_item_id, boundary)
                SELECT ?, ?, ?, i.id, CASE WHEN CAST(? AS float8) IS NULL THEN NULL ELSE
                       ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(CAST(? AS float8), -12.0), 4326)::geography, 15)::geometry) END
                  FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ZONE_TYPE' AND i.code = ? RETURNING id""",
                Long.class, code, "Jardín " + code, parent, atLon, atLon, type);
    }

    private long item(String type, String code) {
        return jdbc.queryForObject("""
                SELECT i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = ? AND i.code = ?""", Long.class, type, code);
    }

    /** SPEC-201 rediseño: activada = registro oficial; sin activar no va al mapa. */
    private long incident(String status, String urgency, Double lat, Double lng, boolean activated, Long zoneId) {
        return jdbc.queryForObject("""
                INSERT INTO incidents (code, title, original_description, description, latitude, longitude, zone_id,
                    status_item_id, urgency_item_id, reported_by_user_id, requested_by_name, activated_at,
                    client_reference, request_hash, created_at, updated_at)
                VALUES ('INC-T-' || substr(md5(random()::text), 1, 10), 'Rama caída', 'Rama caída', 'Rama caída sobre la vereda',
                    ?, ?, ?, ?, ?, ?, 'Áreas verdes', CASE WHEN ? THEN TIMESTAMPTZ '2026-11-01 11:00-05' END,
                    gen_random_uuid(), 'test', TIMESTAMPTZ '2026-11-01 10:00-05', TIMESTAMPTZ '2026-11-01 10:00-05') RETURNING id""",
                Long.class, lat, lng, zoneId, item("INCIDENT_STATUS", status),
                urgency == null ? null : item("URGENCY_LEVEL", urgency), userId, activated);
    }

    private long work(String typeCode, String scheduled) {
        long type = item("INTERVENTION_TYPE", typeCode);
        return jdbc.queryForObject("""
                INSERT INTO interventions (intervention_class_item_id, intervention_type_item_id, planning_status_item_id,
                    team_id, assigned_to_user_id, assigned_by_user_id, created_by_user_id, scheduled_date, description,
                    origin_item_id, reported_by_item_id)
                SELECT t.parent_item_id, t.id, ?, ?, ?, ?, ?, CAST(? AS date), 'Trabajo de prueba', ?, ?
                  FROM catalog_items t WHERE t.id = ? RETURNING id""", Long.class,
                item("INTERVENTION_STATUS", "ASSIGNED"), team, userId, userId, userId, scheduled,
                item("INTERVENTION_ORIGIN", "MAINTENANCE"), item("INCIDENT_SOURCE", "NONE"), type);
    }

    private void location(long work, long zoneId, String status, String startedUtc, String completedUtc) {
        jdbc.update("""
                INSERT INTO intervention_locations (intervention_id, client_reference, zone_id, status_item_id,
                    started_at, completed_at, executed_by_user_id)
                VALUES (?, gen_random_uuid(), ?, ?, CAST(? AS timestamp), CAST(? AS timestamp),
                    CASE WHEN CAST(? AS timestamp) IS NULL THEN NULL ELSE CAST(? AS bigint) END)""",
                work, zoneId, item("INTERVENTION_STATUS", status), startedUtc, completedUtc, startedUtc, userId);
    }

    private List<JsonNode> balloonsOf(String kind) throws Exception {
        var body = mvc.perform(get("/api/v1/map/balloons")
                        .with(user("s@test.local").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsString();
        var found = new ArrayList<JsonNode>();
        for (JsonNode b : json.readTree(body).get("data").get("balloons")) {
            if (b.get("kind").asString().equals(kind) && sectorIs(b)) {
                found.add(b);
            }
        }
        return found;
    }

    private boolean sectorIs(JsonNode balloon) {
        return !balloon.get("sectorId").isNull() && balloon.get("sectorId").asLong() == sector;
    }

    @Test
    void onlyActiveOpenIncidentsHaveABalloon() throws Exception {
        long high = incident("REPORTED", "HIGH", -12.0, lon, true, null);
        long none = incident("IN_PROGRESS", null, -12.0, lon + 0.01, true, null);
        long onItsZone = incident("REPORTED", "LOW", null, null, true, section);
        incident("REPORTED", "HIGH", -12.0, lon, false, null);
        incident("CLOSED", "HIGH", -12.0, lon, true, null);

        var balloons = balloonsOf("INCIDENT");

        assertThat(balloons).extracting(b -> b.get("id").asString())
                .containsExactlyInAnyOrder("INCIDENT:" + high, "INCIDENT:" + none, "INCIDENT:" + onItsZone);
        assertThat(balloons.get(0).get("variant").asString()).isEqualTo("HIGH");
        assertThat(balloons.get(0).get("attention").asBoolean()).isTrue();
        assertThat(balloons.get(0).get("card").get("href").asString()).isEqualTo("/incidencias/" + high);
        assertThat(balloons.get(0).get("card").toString()).contains("Abierta", "Hace 3 días");
        assertThat(balloons.get(1).get("variant").asString()).isEqualTo("LOW");
        assertThat(balloons.get(2).get("variant").asString()).isEqualTo("NONE");
        assertThat(balloons.get(2).get("card").toString()).contains("Sin urgencia");
    }

    private JsonNode balloonWithId(String id) throws Exception {
        var body = mvc.perform(get("/api/v1/map/balloons")
                        .with(user("s@test.local").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andReturn().getResponse().getContentAsString();
        for (JsonNode b : json.readTree(body).get("data").get("balloons")) {
            if (b.get("id").asString().equals(id)) {
                return b;
            }
        }
        throw new AssertionError("Sin globo " + id);
    }

    private boolean inGarden(long garden, JsonNode b) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT ST_Covers(boundary, ST_SetSRID(ST_MakePoint(?, ?), 4326)) FROM zones WHERE id = ?",
                Boolean.class, b.get("longitude").asDouble(), b.get("latitude").asDouble(), garden));
    }

    /** Metros al este de la longitud dada, a la latitud -12 de las pruebas. */
    private static double east(double fromLon, double meters) {
        return fromLon + meters / (111_320 * Math.cos(Math.toRadians(12)));
    }

    @Test
    void balloonsSharingAGardenSpreadCenteredInsideIt() throws Exception {
        long first = incident("REPORTED", "HIGH", -12.0, lon, true, null);
        long second = incident("REPORTED", "LOW", -12.0, lon, true, null);

        var balloons = balloonsOf("INCIDENT");

        assertThat(balloons).hasSize(2).allMatch(b -> inGarden(section, b));
        JsonNode a = balloons.get(0);
        JsonNode b = balloons.get(1);
        assertThat(a.get("id").asString()).isEqualTo("INCIDENT:" + first);
        assertThat(b.get("id").asString()).isEqualTo("INCIDENT:" + second);
        assertThat(a.get("longitude").asDouble()).isNotEqualTo(b.get("longitude").asDouble());
        double midLon = (a.get("longitude").asDouble() + b.get("longitude").asDouble()) / 2;
        double midLat = (a.get("latitude").asDouble() + b.get("latitude").asDouble()) / 2;
        assertThat(Math.abs(midLon - lon) * 111_320).isLessThan(1.5);
        assertThat(Math.abs(midLat + 12.0) * 111_320).isLessThan(1.5);
    }

    @Test
    void aBalloonOutsideEveryGardenLandsOnTheNearestOne() throws Exception {
        long onABuilding = incident("REPORTED", "HIGH", -12.0, east(lon, 40), true, null);

        var balloon = balloonWithId("INCIDENT:" + onABuilding);

        assertThat(inGarden(section, balloon)).isTrue();
        assertThat(balloon.get("sectorId").asLong()).isEqualTo(sector);
    }

    @Test
    void aBalloonOnALoneSpecimenStaysOnIt() throws Exception {
        double specimenLon = east(lon, 40);
        jdbc.update("""
                INSERT INTO green_elements (element_type_item_id, location, registered_by_user_id)
                VALUES (?, ST_SetSRID(ST_MakePoint(?, -12.0), 4326), ?)""",
                item("GREEN_ELEMENT_TYPE", "INDIVIDUAL"), specimenLon, userId);
        long onATree = incident("REPORTED", "HIGH", -12.0, specimenLon, true, null);

        var balloon = balloonWithId("INCIDENT:" + onATree);

        assertThat(balloon.get("longitude").asDouble()).isEqualTo(specimenLon);
        assertThat(balloon.get("latitude").asDouble()).isEqualTo(-12.0);
    }

    @Test
    void workInExecutionIsGreenAndIrrigationIsBlue() throws Exception {
        long pruning = work("PODA_FORMACION", "2026-11-03");
        location(pruning, section, "IN_PROGRESS", "2026-11-04 13:00", null);
        location(pruning, other, "COMPLETED", "2026-11-03 13:00", "2026-11-03 15:00");
        long watering = work("RIEGO_MANUAL", "2026-11-04");
        location(watering, other, "IN_PROGRESS", "2026-11-04 12:00", null);
        long laterWatering = work("RIEGO_MANUAL", "2026-11-05");
        location(laterWatering, section, "ASSIGNED", null, null);

        var green = balloonsOf("INTERVENTION");
        var blue = balloonsOf("IRRIGATION");

        assertThat(green).extracting(b -> b.get("id").asString()).containsExactly("INTERVENTION:" + pruning);
        assertThat(green.getFirst().get("card").get("progress").get("done").asInt()).isEqualTo(1);
        assertThat(green.getFirst().get("card").get("progress").get("total").asInt()).isEqualTo(2);
        assertThat(blue).extracting(b -> b.get("id").asString()).containsExactly("IRRIGATION:" + watering);
        assertThat(blue.getFirst().get("card").toString()).contains("7:00", "Dentro de la ventana");
    }

    @Test
    void irrigationScheduledForTodayShowsBeforeItStarts() throws Exception {
        long today = work("RIEGO_MANUAL", "2026-11-04");
        location(today, section, "ASSIGNED", null, null);

        var blue = balloonsOf("IRRIGATION");

        assertThat(blue).extracting(b -> b.get("id").asString()).containsExactly("IRRIGATION:" + today);
        assertThat(blue.getFirst().get("card").get("status").asString()).isEqualTo("Programado para hoy");
    }

    @Test
    void cuttingMachinerySoonAndUnfinishedIsAGrayBalloon() throws Exception {
        long saturday = work("PODA_SANITARIA", "2026-11-07");
        location(saturday, section, "ASSIGNED", null, null);
        long later = work("PODA_SANITARIA", "2026-11-14");
        location(later, other, "ASSIGNED", null, null);
        jdbc.update("UPDATE interventions SET uses_cutting_machinery = TRUE WHERE id IN (?, ?)", saturday, later);

        var gray = balloonsOf("MACHINERY_CUT");

        assertThat(gray).extracting(b -> b.get("id").asString()).containsExactly("MACHINERY_CUT:" + saturday);
        assertThat(gray.getFirst().get("card").toString()).contains("Programada el", "7 nov");
    }

    @Test
    void aDueGardenShowsOnlyIfItWasIrrigatedBefore() throws Exception {
        long riego = item("INTERVENTION_TYPE", "RIEGO_MANUAL");
        jdbc.update("UPDATE maintenance_frequencies SET deleted_at = CURRENT_TIMESTAMP WHERE activity_type_item_id = ?", riego);
        jdbc.update("""
                INSERT INTO maintenance_frequencies(activity_type_item_id, frequency_rule_type_item_id, regime, scope,
                    min_days_interval, max_days_interval, valid_from)
                SELECT ?, ci.id, 'IN_HOUSE', 'CAMPUS_WIDE', 10, 15, DATE '2026-01-01'
                  FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'FREQUENCY_RULE_TYPE' AND ci.code = 'INTERVAL_DAYS'""", riego);
        long set = jdbc.queryForObject("INSERT INTO green_area_sets(name) VALUES (?) RETURNING id", Long.class,
                "Riego " + UUID.randomUUID());
        jdbc.update("INSERT INTO green_area_set_zones(set_id, zone_id) VALUES (?,?),(?,?)", set, section, set, other);
        jdbc.update("""
                INSERT INTO planning_assignments(set_id, activity_type_item_id, frequency_rule_key)
                SELECT ?, ?, rule_key FROM maintenance_frequencies
                 WHERE activity_type_item_id = ? AND valid_to IS NULL AND deleted_at IS NULL ORDER BY id DESC LIMIT 1""",
                set, riego, riego);
        long old = work("RIEGO_MANUAL", "2026-10-15");
        location(old, section, "COMPLETED", "2026-10-15 12:00", "2026-10-15 14:00");

        var due = balloonsOf("IRRIGATION_DUE");

        assertThat(due).hasSize(1);
        assertThat(due.getFirst().get("variant").asString()).isEqualTo("OVERDUE");
        assertThat(due.getFirst().get("memberCount").asInt()).isEqualTo(1);
        assertThat(due.getFirst().get("card").toString()).contains("Faltan", "2 de 2", "5 días tarde", "15 oct");
    }

    @Test
    void aReservationInProgressHasABalloonOnItsGarden() throws Exception {
        long place = jdbc.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, zone_id)
                SELECT 'Jardín reservado', k.id, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct
                       ON ct.id = ci.catalog_type_id WHERE ct.code = 'REFERENCE_CATEGORY' LIMIT 1), ?
                  FROM catalog_items k JOIN catalog_types kt ON kt.id = k.catalog_type_id AND kt.code = 'PLACE_KIND'
                 WHERE k.code = 'OUTDOOR' RETURNING id""", Long.class, section);
        long org = jdbc.queryForObject("""
                INSERT INTO organizations (name, type_item_id)
                SELECT 'Facultad de Letras', i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT' RETURNING id""", Long.class);
        long contact = jdbc.queryForObject("INSERT INTO contacts (full_name, mobile) VALUES ('Ana', '900000000') RETURNING id",
                Long.class);
        String inProgress = reservation(place, org, contact, "2026-11-04 09:00-05", "2026-11-04 13:00-05");
        reservation(place, org, contact, "2026-11-04 14:00-05", "2026-11-04 16:00-05");

        var balloons = balloonsOf("RESERVATION");

        assertThat(balloons).extracting(b -> b.get("id").asString()).containsExactly("RESERVATION:" + inProgress);
        assertThat(balloons.getFirst().get("card").toString())
                .contains("Facultad de Letras", "9:00", "13:00").doesNotContain("900000000");
    }

    private String reservation(long place, long org, long contact, String starts, String ends) {
        return jdbc.queryForObject("""
                INSERT INTO garden_reservations (place_id, requested_by_organization_id, requester_contact_id,
                    responsible_contact_id, starts_at, ends_at, purpose, created_by_user_id)
                VALUES (?, ?, ?, ?, CAST(? AS timestamptz), CAST(? AS timestamptz), 'Feria', ?) RETURNING code""",
                String.class, place, org, contact, contact, starts, ends, userId);
    }
}
