package pe.edu.pucp.hesperides.modules.reservations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

/** SPEC-107 de punta a punta: agenda, cruces, cercanía, estados y permisos. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "reservas@pucp.edu.pe", authorities = "COORDINADOR")
class ReservationsIntegrationTest {

    private static final String RESERVATIONS = "/api/v1/reservations";
    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private long userId;
    private long rosalesId;
    private long rosalesZoneId;
    private String organization;
    private String contact;

    @BeforeEach
    void data() {
        userId = account("reservas@pucp.edu.pe");
        rosalesId = jdbc.queryForObject("""
                SELECT id FROM places WHERE name = 'Jardín Rosales' AND parent_place_id IS NULL
                   AND deleted_at IS NULL""", Long.class);
        rosalesZoneId = jdbc.queryForObject("SELECT zone_id FROM places WHERE id = ?", Long.class, rosalesId);
        organization = jdbc.queryForObject("""
                INSERT INTO organizations (name, type_item_id)
                SELECT 'Facultad de Letras', i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT' RETURNING code""", String.class);
        long contactId = jdbc.queryForObject("""
                INSERT INTO contacts (full_name, mobile) VALUES ('Juan Diego Villasante', '987654321') RETURNING id""",
                Long.class);
        contact = jdbc.queryForObject("SELECT code FROM contacts WHERE id = ?", String.class, contactId);
        jdbc.update("""
                INSERT INTO contact_organizations (contact_id, organization_id)
                SELECT ?, id FROM organizations WHERE code = ?""", contactId, organization);
    }

    private long account(String email) {
        return jdbc.queryForObject("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT ?, 'x', 'Prueba', 'Reservas', i.id
                  FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = 'COORDINADOR' RETURNING id""", Long.class, email);
    }

    private static OffsetDateTime at(LocalDate day, int hour) {
        return day.atTime(hour, 0).atZone(LIMA).toOffsetDateTime();
    }

    private static String body(long placeId, String organization, String contact, OffsetDateTime start,
            OffsetDateTime end, String purpose, Long version) {
        String contactValue = contact == null ? "null" : "\"" + contact + "\"";
        String versionValue = version == null ? "null" : version.toString();
        return """
                {"placeId":%d,"organizationCode":"%s","contactCode":%s,"startsAt":"%s","endsAt":"%s",
                 "purpose":%s,"version":%s}"""
                .formatted(placeId, organization, contactValue, start, end,
                        purpose == null ? "null" : "\"" + purpose + "\"", versionValue);
    }

    private ResultActions create(String body) throws Exception {
        return mockMvc.perform(post(RESERVATIONS).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions create(long placeId, OffsetDateTime start, OffsetDateTime end) throws Exception {
        return create(body(placeId, organization, contact, start, end, "Feria", null));
    }

    private static String codeOf(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.code");
    }

    @Nested
    class Registering {

        @Test
        void aCoordinatorRegistersAReservationAndFindsItInTheAgenda() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.place.name").value("Jardín Rosales"))
                    .andExpect(jsonPath("$.data.organization.code").value(organization))
                    .andExpect(jsonPath("$.data.contact.code").value(contact))
                    .andExpect(jsonPath("$.data.state").value("UPCOMING"))
                    .andExpect(jsonPath("$.data.version").value(0))
                    .andExpect(jsonPath("$.data.warnings").isEmpty()));

            assertThat(code).matches("RES-\\d{4}");
            mockMvc.perform(get(RESERVATIONS).param("from", day.toString()).param("to", day.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.items[*].code", contains(code)))
                    .andExpect(jsonPath("$.data.total").value(1));
        }

        @Test
        void overlappingReservationsAreBothSavedWithAWarning() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated());

            create(rosalesId, at(day, 11), at(day, 13))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.warnings[*].kind", contains("OVERLAPPING_RESERVATION")))
                    .andExpect(jsonPath("$.data.warnings[0].severity").value("WARNING"))
                    .andExpect(jsonPath("$.data.warnings[0].reservationCode", matchesPattern("RES-\\d{4}")));

            assertThat(jdbc.queryForObject("SELECT count(*) FROM garden_reservations WHERE place_id = ?",
                    Integer.class, rosalesId)).isEqualTo(2);
        }

        @Test
        void adjacentReservationsDoNotWarn() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated());

            create(rosalesId, at(day, 14), at(day, 16))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.warnings").isEmpty());
        }

        @Test
        void aReservationMustEndAfterItStarts() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(rosalesId, at(day, 14), at(day, 14))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("The reservation must end after it starts"));
        }

        @Test
        void aReservationCannotLastMoreThanSevenDays() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(rosalesId, at(day, 10), at(day.plusDays(7), 11))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("A reservation cannot last more than 7 days"));
        }

        @Test
        void aPlaceThatIsNotAReservableGardenIsRejected() throws Exception {
            long place = jdbc.queryForObject("""
                    INSERT INTO places (name, kind_item_id, category_item_id)
                    SELECT 'Lugar sin jardín', k.id, c.id FROM catalog_items k
                      JOIN catalog_types kt ON kt.id = k.catalog_type_id AND kt.code = 'PLACE_KIND' AND k.code = 'OUTDOOR'
                      CROSS JOIN (SELECT id FROM catalog_items WHERE catalog_type_id =
                                  (SELECT id FROM catalog_types WHERE code = 'REFERENCE_CATEGORY') LIMIT 1) c
                    RETURNING id""", Long.class);
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(place, at(day, 10), at(day, 14))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("That garden cannot be reserved"));
        }

        @Test
        void aContactFromAnotherOrganizationIsRejected() throws Exception {
            String other = jdbc.queryForObject("""
                    INSERT INTO organizations (name, type_item_id)
                    SELECT 'Facultad de Ciencias', i.id FROM catalog_items i
                      JOIN catalog_types t ON t.id = i.catalog_type_id
                     WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT' RETURNING code""", String.class);
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(body(rosalesId, other, contact, at(day, 10), at(day, 14), "Feria", null))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("The contact does not belong to that organization"));
        }

        @Test
        void editingWithAStaleVersionConflicts() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(body(rosalesId, organization, contact, at(day, 11), at(day, 15), "Cambio", 0L)))
                    .andExpect(status().isOk());

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(body(rosalesId, organization, contact, at(day, 12), at(day, 16), "Otra", 0L)))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    class States {

        @Test
        void aPastReservationIsFinishedAndCannotBeEditedOrCancelled() throws Exception {
            LocalDate day = LocalDate.now(LIMA).minusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.state").value("FINISHED")));

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(body(rosalesId, organization, contact, at(day, 11), at(day, 15), "x", 0L)))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("This reservation already finished or was cancelled"));

            mockMvc.perform(post(RESERVATIONS + "/" + code + "/cancel").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"Ya pasó\",\"version\":0}"))
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void cancellingNeedsAReasonAndKeepsTheReservationWhenAsked() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(post(RESERVATIONS + "/" + code + "/cancel").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\" \",\"version\":0}"))
                    .andExpect(status().isUnprocessableEntity());

            mockMvc.perform(post(RESERVATIONS + "/" + code + "/cancel").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"Suspensión de clases\",\"version\":0}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.state").value("CANCELLED"))
                    .andExpect(jsonPath("$.data.cancelReason").value("Suspensión de clases"));

            mockMvc.perform(get(RESERVATIONS).param("from", day.toString()).param("to", day.toString()))
                    .andExpect(jsonPath("$.data.total").value(0));

            mockMvc.perform(get(RESERVATIONS).param("from", day.toString()).param("to", day.toString())
                            .param("includeCancelled", "true"))
                    .andExpect(jsonPath("$.data.items[*].code", contains(code)))
                    .andExpect(jsonPath("$.data.items[0].state").value("CANCELLED"));
        }
    }

    @Nested
    class Proximity {

        @Test
        void nearbyWarnsAboutAReservationInTheSameSection() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(get(RESERVATIONS + "/nearby").param("date", day.toString())
                            .param("zoneIds", String.valueOf(rosalesZoneId)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[*].kind", hasItem("RESERVED_HERE")))
                    .andExpect(jsonPath("$.data[0].severity").value("CRITICAL"))
                    .andExpect(jsonPath("$.data[0].reservationCode").value(code));
        }

        @Test
        void aPointSixMetresAwayWarnsAndFifteenMetresDoesNot() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            long garden = reservableGarden();
            long zone = jdbc.queryForObject("SELECT zone_id FROM places WHERE id = ?", Long.class, garden);
            String code = codeOf(create(garden, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(get(RESERVATIONS + "/nearby").param("date", day.toString())
                            .param("points", pointOutsideZone(zone, 26)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[*].kind", hasItem("RESERVED_NEARBY")))
                    .andExpect(jsonPath("$.data[0].reservationCode").value(code))
                    .andExpect(jsonPath("$.data[0].text",
                            org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("A 0 m"))));

            mockMvc.perform(get(RESERVATIONS + "/nearby").param("date", day.toString())
                            .param("points", pointOutsideZone(zone, 35)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[?(@.reservationCode == '" + code + "')]").isEmpty());
        }

        /** Un jardín circular de 20 m de radio lejos del campus, para medir distancias exactas. */
        private long reservableGarden() {
            String code = "T-" + UUID.randomUUID().toString().substring(0, 8);
            long zone = jdbc.queryForObject("""
                    INSERT INTO zones (code, name, zone_type_item_id, boundary, is_reservable,
                        reservation_owner_item_id)
                    SELECT ?, 'Jardín de prueba', zt.id,
                           ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(-77.15, -12.10), 4326)::geography, 20)::geometry),
                           TRUE, ro.id
                      FROM catalog_items zt
                      JOIN catalog_types ztt ON ztt.id = zt.catalog_type_id AND ztt.code = 'ZONE_TYPE'
                      CROSS JOIN catalog_items ro
                      JOIN catalog_types rot ON rot.id = ro.catalog_type_id AND rot.code = 'RESERVATION_OWNER'
                     WHERE zt.code = 'SECTION' AND ro.code = 'DAF' RETURNING id""", Long.class, code);
            return jdbc.queryForObject("""
                    INSERT INTO places (name, kind_item_id, category_item_id, zone_id)
                    SELECT 'Jardín ' || ?, k.id, c.id, ?
                      FROM catalog_items k
                      JOIN catalog_types kt ON kt.id = k.catalog_type_id AND kt.code = 'PLACE_KIND'
                      CROSS JOIN (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                   WHERE ct.code = 'REFERENCE_CATEGORY' LIMIT 1) c
                     WHERE k.code = 'OUTDOOR' RETURNING id""", Long.class, code, zone);
        }

        private String pointOutsideZone(long zoneId, int metresFromCentre) {
            Map<String, Object> point = jdbc.queryForMap("""
                    SELECT ST_Y(g) AS lat, ST_X(g) AS lon FROM (
                      SELECT ST_Project(ST_Centroid(boundary)::geography, ?, radians(0))::geometry AS g
                        FROM zones WHERE id = ?) q""", metresFromCentre, zoneId);
            return point.get("lat") + "," + point.get("lon");
        }

        @Test
        void pendingWorkInTheGardenWarnsButCompletedWorkDoesNot() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));
            long pending = intervention(day, rosalesZoneId, null);
            long completed = intervention(day, rosalesZoneId, at(day, 10).toInstant());

            String json = mockMvc.perform(get(RESERVATIONS + "/check").param("placeId", String.valueOf(rosalesId))
                            .param("startsAt", at(day, 10).toString()).param("endsAt", at(day, 14).toString())
                            .param("excludeCode", code))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

            List<Map<String, Object>> warnings = JsonPath.read(json, "$.data");
            assertThat(warnings).extracting(w -> w.get("kind")).contains("WORK_HERE");
            assertThat(warnings.stream().filter(w -> w.get("interventionId") != null)
                    .map(w -> ((Number) w.get("interventionId")).longValue()))
                    .contains(pending).doesNotContain(completed);            assertThat(warnings.stream().filter(w -> "WORK_HERE".equals(w.get("kind"))).findFirst().orElseThrow()
                    .get("severity")).isEqualTo("CRITICAL");
        }

        @Test
        void workScheduledAfterTheLastDayOfTheReservationDoesNotWarn() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            long place = rosalesId;
            create(place, at(day, 10), at(day, 14)).andExpect(status().isCreated());
            long later = intervention(day.plusDays(2), rosalesZoneId, null);

            String json = mockMvc.perform(get(RESERVATIONS + "/check").param("placeId", String.valueOf(place))
                            .param("startsAt", at(day, 10).toString()).param("endsAt", at(day, 14).toString()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

            List<Map<String, Object>> warnings = JsonPath.read(json, "$.data");
            assertThat(warnings.stream().filter(w -> w.get("interventionId") != null)
                    .map(w -> ((Number) w.get("interventionId")).longValue())).doesNotContain(later);
        }

        @Test
        void aCancelledInterventionDoesNotWarn() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            long place = rosalesId;
            create(place, at(day, 10), at(day, 14)).andExpect(status().isCreated());
            long cancelled = intervention("CANCELLED", day, rosalesZoneId, null);

            String json = mockMvc.perform(get(RESERVATIONS + "/check").param("placeId", String.valueOf(place))
                            .param("startsAt", at(day, 10).toString()).param("endsAt", at(day, 14).toString()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

            assertThat(JsonPath.<List<Map<String, Object>>>read(json, "$.data").stream()
                    .filter(w -> w.get("interventionId") != null)
                    .map(w -> ((Number) w.get("interventionId")).longValue())).doesNotContain(cancelled);
        }

        @Test
        void theNearbyWindowReachesSevenDaysAhead() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String inside = codeOf(create(rosalesId, at(day.plusDays(6), 10), at(day.plusDays(6), 14))
                    .andExpect(status().isCreated()));
            String outside = codeOf(create(rosalesId, at(day.plusDays(8), 10), at(day.plusDays(8), 14))
                    .andExpect(status().isCreated()));

            mockMvc.perform(get(RESERVATIONS + "/nearby").param("date", day.toString())
                            .param("zoneIds", String.valueOf(rosalesZoneId)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[*].reservationCode", hasItem(inside)))
                    .andExpect(jsonPath("$.data[*].reservationCode",
                            org.hamcrest.Matchers.not(hasItem(outside))));
        }

        private long intervention(LocalDate scheduled, long zoneId, java.time.Instant completedAt) {
            return intervention("PLANNED", scheduled, zoneId, completedAt);
        }

        private long intervention(String planning, LocalDate scheduled, long zoneId, java.time.Instant completedAt) {
            long id = jdbc.queryForObject("""
                    INSERT INTO interventions (intervention_class_item_id, planning_status_item_id, created_by_user_id,
                        scheduled_date, origin_item_id, reported_by_item_id)
                    SELECT cl.id, ps.id, ?, ?, o.id, r.id
                      FROM catalog_items cl
                      JOIN catalog_types clt ON clt.id = cl.catalog_type_id AND clt.code = 'INTERVENTION_CLASS'
                      CROSS JOIN catalog_items ps
                      CROSS JOIN catalog_items o
                      CROSS JOIN catalog_items r
                     WHERE cl.code = 'MANTENIMIENTO'
                       AND ps.code = ? AND ps.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS')
                       AND o.code = 'MAINTENANCE' AND o.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INTERVENTION_ORIGIN')
                       AND r.code = 'NONE' AND r.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_SOURCE')
                    RETURNING id""", Long.class, userId, scheduled, planning);
            jdbc.update("""
                    INSERT INTO intervention_locations (intervention_id, client_reference, zone_id, status_item_id,
                        started_at, completed_at, executed_by_user_id)
                    VALUES (?, ?, ?, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                                       WHERE ct.code = 'INTERVENTION_STATUS' AND ci.code = 'PLANNED'), ?, ?, ?)""",
                    id, UUID.randomUUID(), zoneId,
                    completedAt == null ? null
                            : LocalDateTime.ofInstant(completedAt.minusSeconds(2 * 24 * 3600), ZoneOffset.UTC),
                    completedAt == null ? null : LocalDateTime.ofInstant(completedAt, ZoneOffset.UTC),
                    completedAt == null ? null : userId);
            return id;
        }
    }

    @Nested
    class Permissions {

        @Test
        @WithMockUser(username = "reservas@pucp.edu.pe", authorities = "SUPERVISOR")
        void aSupervisorReadsTheAgendaButCannotMaintainIt() throws Exception {
            mockMvc.perform(get(RESERVATIONS)).andExpect(status().isOk());
            mockMvc.perform(get(RESERVATIONS + "/gardens")).andExpect(status().isOk());
            mockMvc.perform(get(RESERVATIONS + "/organizations")).andExpect(status().isOk());

            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isForbidden());
            mockMvc.perform(get(RESERVATIONS + "/check").param("placeId", String.valueOf(rosalesId))
                            .param("startsAt", at(day, 10).toString()).param("endsAt", at(day, 14).toString()))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get(RESERVATIONS + "/nearby").param("date", day.toString())
                            .param("zoneIds", String.valueOf(rosalesZoneId)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "reservas@pucp.edu.pe", authorities = "OPERARIO")
        void theOperatorAlsoSeesTheContactOfAReservation() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = jdbc.queryForObject("""
                    INSERT INTO garden_reservations (place_id, organization_id, contact_id, starts_at, ends_at,
                        purpose, created_by_user_id)
                    SELECT ?, o.id, c.id, ?, ?, 'Feria', ?
                      FROM organizations o, contacts c WHERE o.code = ? AND c.code = ? RETURNING code""",
                    String.class, rosalesId, at(day, 10), at(day, 14), userId, organization, contact);

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.organization.name").value("Facultad de Letras"))
                    .andExpect(jsonPath("$.data.contact.fullName").value("Juan Diego Villasante"))
                    .andExpect(jsonPath("$.data.contact.mobile").value("987654321"));
        }
    }
}
