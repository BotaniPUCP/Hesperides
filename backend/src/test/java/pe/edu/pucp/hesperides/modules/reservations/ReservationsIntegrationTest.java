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
    private String requestedBy;
    private String requester;
    private String requestedFor;
    private String otherResponsible;

    @BeforeEach
    void data() {
        userId = account("reservas@pucp.edu.pe");
        rosalesId = jdbc.queryForObject("""
                SELECT id FROM places WHERE name = 'Jardín Rosales' AND parent_place_id IS NULL
                   AND deleted_at IS NULL""", Long.class);
        rosalesZoneId = jdbc.queryForObject("SELECT zone_id FROM places WHERE id = ?", Long.class, rosalesId);
        requestedBy = organization("Facultad de Letras");
        requestedFor = organization("CF Psicología");
        requester = contact("Juan Diego Villasante", "987654321", requestedBy, "Delegado");
        otherResponsible = contact("María Quispe", "912345678", requestedFor, "Presidenta");
    }

    private String organization(String name) {
        return jdbc.queryForObject("""
                INSERT INTO organizations (name, type_item_id)
                SELECT ?, i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT' RETURNING code""", String.class, name);
    }

    private String contact(String fullName, String mobile, String organizationCode, String role) {
        long contactId = jdbc.queryForObject("INSERT INTO contacts (full_name, mobile) VALUES (?, ?) RETURNING id",
                Long.class, fullName, mobile);
        jdbc.update("""
                INSERT INTO contact_organizations (contact_id, organization_id, role)
                SELECT ?, id, ? FROM organizations WHERE code = ?""", contactId, role, organizationCode);
        return jdbc.queryForObject("SELECT code FROM contacts WHERE id = ?", String.class, contactId);
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

    /** Crear: los cuatro códigos; `version` nula. */
    private static String createBody(long placeId, String requestedBy, String requester, String requestedFor,
            String responsible, OffsetDateTime start, OffsetDateTime end, String purpose) {
        return """
                {"placeId":%d,"requestedByCode":"%s","requesterCode":"%s","requestedForCode":%s,
                 "responsibleCode":"%s","startsAt":"%s","endsAt":"%s","purpose":%s,"version":null}"""
                .formatted(placeId, requestedBy, requester,
                        requestedFor == null ? "null" : "\"" + requestedFor + "\"", responsible, start, end,
                        purpose == null ? "null" : "\"" + purpose + "\"");
    }

    /** Editar: sin `requestedByCode` ni `requesterCode` (D-02), con `version`. */
    private static String editBody(long placeId, String requestedFor, String responsible, OffsetDateTime start,
            OffsetDateTime end, String purpose, Long version) {
        return """
                {"placeId":%d,"requestedForCode":%s,"responsibleCode":"%s","startsAt":"%s","endsAt":"%s",
                 "purpose":%s,"version":%s}"""
                .formatted(placeId, requestedFor == null ? "null" : "\"" + requestedFor + "\"",
                        responsible, start, end,
                        purpose == null ? "null" : "\"" + purpose + "\"", version == null ? "null" : version.toString());
    }

    private ResultActions create(String body) throws Exception {
        return mockMvc.perform(post(RESERVATIONS).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions create(long placeId, OffsetDateTime start, OffsetDateTime end) throws Exception {
        return create(createBody(placeId, requestedBy, requester, null, requester, start, end, "Feria"));
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
                    .andExpect(jsonPath("$.data.requestedBy.code").value(requestedBy))
                    .andExpect(jsonPath("$.data.requester.code").value(requester))
                    .andExpect(jsonPath("$.data.requestedFor").doesNotExist())
                    .andExpect(jsonPath("$.data.responsible.code").value(requester))
                    .andExpect(jsonPath("$.data.responsibleHistory").isEmpty())
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
        void aReservationStartsAndEndsOnTheSameDay() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(rosalesId, at(day, 22), at(day.plusDays(1), 1))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("A reservation starts and ends on the same day"));
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
        void aRequesterFromAnotherOrganizationIsRejected() throws Exception {
            String other = organization("Facultad de Ciencias");
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(createBody(rosalesId, other, requester, null, requester, at(day, 10), at(day, 14), "Feria"))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message")
                            .value("The requester must belong to the organization that requests it"));
        }

        @Test
        void aReservationNeedsAResponsible() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            mockMvc.perform(post(RESERVATIONS).contentType(MediaType.APPLICATION_JSON)
                            .content(createBody(rosalesId, requestedBy, requester, null, "CON-9999",
                                    at(day, 10), at(day, 14), "Feria")))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("A responsible contact is required"));
        }

        @Test
        void aResponsibleFromAnyOrganizationIsSaved() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(createBody(rosalesId, requestedBy, requester, requestedFor, otherResponsible,
                    at(day, 10), at(day, 14), "Feria"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.responsible.code").value(otherResponsible))
                    .andExpect(jsonPath("$.data.responsible.role").value("Presidenta"));
        }

        @Test
        void aRequestedForEqualToRequestedByIsSavedEmpty() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);

            create(createBody(rosalesId, requestedBy, requester, requestedBy, requester, at(day, 10), at(day, 14), "Feria"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.requestedFor").doesNotExist());
        }

        @Test
        void editingWithAStaleVersionConflicts() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(editBody(rosalesId, null, requester, at(day, 11), at(day, 15), "Cambio", 0L)))
                    .andExpect(status().isOk());

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(editBody(rosalesId, null, requester, at(day, 12), at(day, 16), "Otra", 0L)))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    class RequesterAndResponsible {

        @Test
        void whoRequestedCannotChangeOnEdit() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"placeId":%d,"requestedByCode":"%s","requesterCode":"%s","responsibleCode":"%s",
                                     "startsAt":"%s","endsAt":"%s","purpose":"x","version":0}"""
                                    .formatted(rosalesId, requestedBy, requester, requester,
                                            at(day, 11), at(day, 15))))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message")
                            .value("Who requested the reservation cannot change: cancel it and register a new one"));
        }

        @Test
        void creatingLeavesOneHistoryRowAndChangingTheResponsibleAddsAnother() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            assertThat(historyCount(code)).isEqualTo(1);

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(editBody(rosalesId, requestedFor, otherResponsible, at(day, 11), at(day, 15),
                                    "Cambio", 0L)))
                    .andExpect(status().isOk());

            assertThat(historyCount(code)).isEqualTo(2);
            assertThat(jdbc.queryForObject(
                    "SELECT responsible_contact_id FROM garden_reservations WHERE code = ?",
                    Long.class, code))
                    .isEqualTo(jdbc.queryForObject("SELECT id FROM contacts WHERE code = ?",
                            Long.class, otherResponsible));

            // Editar sin cambiar el responsable no agrega filas.
            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(editBody(rosalesId, requestedFor, otherResponsible, at(day, 12), at(day, 16),
                                    "Otro", 1L)))
                    .andExpect(status().isOk());
            assertThat(historyCount(code)).isEqualTo(2);
        }

        @Test
        void theDetailShowsTheResponsibleHistoryWithWhoChangedIt() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            mockMvc.perform(put(RESERVATIONS + "/" + code).contentType(MediaType.APPLICATION_JSON)
                            .content(editBody(rosalesId, requestedFor, otherResponsible, at(day, 11), at(day, 15),
                                    "Cambio", 0L)))
                    .andExpect(status().isOk());

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(jsonPath("$.data.responsible.code").value(otherResponsible))
                    .andExpect(jsonPath("$.data.responsible.role").value("Presidenta"))
                    .andExpect(jsonPath("$.data.responsibleHistory", org.hamcrest.Matchers.hasSize(2)))
                    .andExpect(jsonPath("$.data.responsibleHistory[0].contact.code").value(requester))
                    .andExpect(jsonPath("$.data.responsibleHistory[1].contact.code").value(otherResponsible))
                    .andExpect(jsonPath("$.data.responsibleHistory[1].assignedBy").value("reservas@pucp.edu.pe"));
        }

        private int historyCount(String code) {
            return jdbc.queryForObject("""
                    SELECT count(*) FROM garden_reservation_responsibles h
                      JOIN garden_reservations r ON r.id = h.reservation_id
                     WHERE r.code = ?""", Integer.class, code);
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
                            .content(editBody(rosalesId, null, requester, at(day, 11), at(day, 15), "x", 0L)))
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
    class Followup {

        /** Reserva en curso creada directo en la base, con horario relativo a ahora. */
        private String inProgress(java.time.Duration startedAgo, java.time.Duration endsIn) {
            OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).minus(startedAgo);
            OffsetDateTime end = OffsetDateTime.now(ZoneOffset.UTC).plus(endsIn);
            return jdbc.queryForObject("""
                    INSERT INTO garden_reservations (place_id, requested_by_organization_id, requester_contact_id,
                        responsible_contact_id, starts_at, ends_at, purpose, created_by_user_id)
                    SELECT ?, ro.id, rq.id, rs.id, ?, ?, 'Feria', ?
                      FROM organizations ro, contacts rq, contacts rs
                     WHERE ro.code = ? AND rq.code = ? AND rs.code = ? RETURNING code""",
                    String.class, rosalesId, start, end, userId, requestedBy, requester, requester);
        }

        private ResultActions confirm(String code, String body) throws Exception {
            return mockMvc.perform(put(RESERVATIONS + "/" + code + "/confirmation")
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        private ResultActions usage(String code, String body) throws Exception {
            return mockMvc.perform(put(RESERVATIONS + "/" + code + "/usage")
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        @Test
        void aCoordinatorConfirmsTheUseAndTheHistoryKeepsIt() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            confirm(code, "{\"confirmed\":true,\"version\":0}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.useConfirmed").value(true))
                    .andExpect(jsonPath("$.data.canConfirm").value(true))
                    .andExpect(jsonPath("$.data.version").value(1));

            assertThat(jdbc.queryForObject(
                    "SELECT count(*) FROM garden_reservation_confirmations h"
                            + " JOIN garden_reservations r ON r.id = h.reservation_id WHERE r.code = ?",
                    Integer.class, code)).isEqualTo(1);

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(jsonPath("$.data.useConfirmed").value(true))
                    .andExpect(jsonPath("$.data.confirmationHistory", org.hamcrest.Matchers.hasSize(1)))
                    .andExpect(jsonPath("$.data.confirmationHistory[0].value").value(true))
                    .andExpect(jsonPath("$.data.confirmationHistory[0].by").value("reservas@pucp.edu.pe"));
        }

        @Test
        void unconfirmingAddsAnotherHistoryRow() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            confirm(code, "{\"confirmed\":true,\"version\":0}").andExpect(status().isOk());
            confirm(code, "{\"confirmed\":false,\"version\":1}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.useConfirmed").value(false));

            assertThat(jdbc.queryForObject(
                    "SELECT count(*) FROM garden_reservation_confirmations h"
                            + " JOIN garden_reservations r ON r.id = h.reservation_id WHERE r.code = ?",
                    Integer.class, code)).isEqualTo(2);
        }

        @Test
        void confirmingWithAStaleVersionConflicts() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));

            confirm(code, "{\"confirmed\":true,\"version\":0}").andExpect(status().isOk());
            confirm(code, "{\"confirmed\":false,\"version\":0}").andExpect(status().isConflict());
        }

        @Test
        void theConfirmationClosesMinutesBeforeTheEnd() throws Exception {
            // Fin en 10 min con corte de 20: el plazo cerró hace 10 minutos.
            String code = inProgress(java.time.Duration.ofMinutes(30), java.time.Duration.ofMinutes(10));

            confirm(code, "{\"confirmed\":true,\"version\":0}")
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value(
                            "The confirmation window is closed: it closes 20 minutes before the reservation ends"));
        }

        @Test
        void theUsageClosesMinutesBeforeTheEndToo() throws Exception {
            // Fin en 10 min con corte de 20: dentro del horario, pero tras el corte.
            String code = inProgress(java.time.Duration.ofMinutes(30), java.time.Duration.ofMinutes(10));

            usage(code, "{\"used\":true,\"version\":0}")
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value(
                            "The usage window is closed: it closes 20 minutes before the reservation ends"));

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(jsonPath("$.data.usageState").value("NOT_IN_USE"))
                    .andExpect(jsonPath("$.data.canRecordUsage").value(false));
        }

        @Test
        @WithMockUser(username = "reservas@pucp.edu.pe", authorities = "SUPERVISOR")
        void aSupervisorCannotConfirmButCanRecordUsage() throws Exception {
            String code = inProgress(java.time.Duration.ofMinutes(30), java.time.Duration.ofMinutes(90));

            confirm(code, "{\"confirmed\":true,\"version\":0}").andExpect(status().isForbidden());

            usage(code, "{\"used\":true,\"version\":0}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.spaceUsed").value(true))
                    .andExpect(jsonPath("$.data.usageState").value("IN_USE"))
                    .andExpect(jsonPath("$.data.canRecordUsage").value(true));

            assertThat(jdbc.queryForObject(
                    "SELECT count(*) FROM garden_reservation_usages h"
                            + " JOIN garden_reservations r ON r.id = h.reservation_id WHERE r.code = ?",
                    Integer.class, code)).isEqualTo(1);
        }

        @Test
        void usageIsRecordedOnlyWhileTheScheduleIsRunning() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String upcoming = codeOf(create(rosalesId, at(day, 10), at(day, 14)).andExpect(status().isCreated()));
            usage(upcoming, "{\"used\":true,\"version\":0}")
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("The space is marked as used once the reservation starts"));

            LocalDate past = LocalDate.now(LIMA).minusDays(2);
            String finished = codeOf(create(rosalesId, at(past, 10), at(past, 14))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.state").value("FINISHED")));
            usage(finished, "{\"used\":true,\"version\":0}")
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.message").value("This reservation already finished or was cancelled"));

            mockMvc.perform(get(RESERVATIONS + "/" + finished))
                    .andExpect(jsonPath("$.data.usageState").value("NOT_USED"));
        }

        @Test
        @WithMockUser(username = "reservas@pucp.edu.pe", authorities = "OPERARIO")
        void anOperatorCannotRecordUsageButReadsTheFields() throws Exception {
            String code = inProgress(java.time.Duration.ofMinutes(30), java.time.Duration.ofMinutes(90));

            usage(code, "{\"used\":true,\"version\":0}").andExpect(status().isForbidden());

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.usageState").value("NOT_IN_USE"))
                    .andExpect(jsonPath("$.data.canRecordUsage").value(true));
        }

        @Test
        void markingAndUnmarkingTheUsageLeavesTwoHistoryRows() throws Exception {
            String code = inProgress(java.time.Duration.ofMinutes(30), java.time.Duration.ofMinutes(90));

            usage(code, "{\"used\":true,\"version\":0}").andExpect(status().isOk());
            usage(code, "{\"used\":false,\"version\":1}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.spaceUsed").value(false))
                    .andExpect(jsonPath("$.data.usageState").value("NOT_IN_USE"));

            assertThat(jdbc.queryForObject(
                    "SELECT count(*) FROM garden_reservation_usages h"
                            + " JOIN garden_reservations r ON r.id = h.reservation_id WHERE r.code = ?",
                    Integer.class, code)).isEqualTo(2);
        }

        @Test
        void aMarkedUsageOfAFinishedReservationShowsUsed() throws Exception {
            String code = inProgress(java.time.Duration.ofHours(3), java.time.Duration.ofMinutes(30));
            usage(code, "{\"used\":true,\"version\":0}").andExpect(status().isOk());

            jdbc.update("""
                    UPDATE garden_reservations SET starts_at = now() - interval '5 hours',
                        ends_at = now() - interval '1 hour' WHERE code = ?""", code);

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(jsonPath("$.data.state").value("FINISHED"))
                    .andExpect(jsonPath("$.data.usageState").value("USED"));
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
        void theOperatorAlsoSeesTheOrganizationsAndContactsOfAReservation() throws Exception {
            LocalDate day = LocalDate.now(LIMA).plusDays(2);
            String code = jdbc.queryForObject("""
                    INSERT INTO garden_reservations (place_id, requested_by_organization_id, requester_contact_id,
                        requested_for_organization_id, responsible_contact_id, starts_at, ends_at,
                        purpose, created_by_user_id)
                    SELECT ?, ro.id, rq.id, rf.id, rs.id, ?, ?, 'Feria', ?
                      FROM organizations ro, organizations rf, contacts rq, contacts rs
                     WHERE ro.code = ? AND rf.code = ? AND rq.code = ? AND rs.code = ? RETURNING code""",
                    String.class, rosalesId, at(day, 10), at(day, 14), userId,
                    requestedBy, requestedFor, requester, otherResponsible);

            mockMvc.perform(get(RESERVATIONS + "/" + code))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.requestedBy.name").value("Facultad de Letras"))
                    .andExpect(jsonPath("$.data.requestedFor.name").value("CF Psicología"))
                    .andExpect(jsonPath("$.data.requester.fullName").value("Juan Diego Villasante"))
                    .andExpect(jsonPath("$.data.requester.mobile").value("987654321"))
                    .andExpect(jsonPath("$.data.responsible.fullName").value("María Quispe"));
        }
    }
}
