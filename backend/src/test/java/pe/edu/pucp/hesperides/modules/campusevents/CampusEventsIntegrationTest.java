package pe.edu.pucp.hesperides.modules.campusevents;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentBusinessCalendar;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-114 §8. El reloj es el miércoles 4 nov 2026, 10:00 en Lima. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(CampusEventsIntegrationTest.FixedClock.class)
class CampusEventsIntegrationTest {

    static final Instant NOW = Instant.parse("2026-11-04T15:00:00Z");
    static final PostgreSQLContainer<?> POSTGRES = TestDatabase.newContainer();
    private static final String EVENTS = "/api/v1/campus-events";

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
        Clock fixedCampusEventsClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    IncidentBusinessCalendar businessDays;
    private final ObjectMapper json = new ObjectMapper();

    private String coordinator;
    private long sector;
    private long section;
    private long neighbour;

    @BeforeEach
    void sectorWithTwoSections() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        coordinator = "coord-" + tag + "@test.local";
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT ?, 'x', 'Rosa', 'Coordinadora', i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = 'COORDINADOR'""", coordinator);
        double lon = -70.0 - (Math.abs(tag.hashCode()) % 1000) * 0.01;
        sector = zone("SECTOR", null, "S-" + tag, null);
        section = zone("SECTION", sector, "A-" + tag, lon);
        neighbour = zone("SECTION", sector, "B-" + tag, lon + 0.01);
        // Cada prueba empieza sin eventos: los de otras pruebas no deben cruzarse con los suyos.
        jdbc.update("UPDATE campus_events SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL");
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

    private RequestPostProcessor as(String email, String role) {
        return user(email).authorities(new SimpleGrantedAuthority(role));
    }

    private ResultActions create(String body) throws Exception {
        return mvc.perform(post(EVENTS).with(as(coordinator, "COORDINADOR"))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long created(String body) throws Exception {
        String response = create(body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("data").get("id").asLong();
    }

    private String culturalThursdays(String scope, Long zoneId) {
        return """
                {"name":"Jueves cultural","typeCode":"BLOCKING","scope":"%s","zoneId":%s,
                 "startDate":"2026-11-05","endDate":"2026-12-31","startTime":"14:00","endTime":"18:00","weekdays":[4]}
                """.formatted(scope, zoneId);
    }

    @Test
    void coordinationRegistersAndEveryoneReadsTheOccurrences() throws Exception {
        long id = created(culturalThursdays("SECTION", section));

        mvc.perform(get(EVENTS).with(as("op@test.local", "OPERARIO"))
                        .param("from", "2026-11-01").param("to", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.eventId == %d)].date".formatted(id),
                        contains("2026-11-05", "2026-11-12", "2026-11-19", "2026-11-26")))
                .andExpect(jsonPath("$.data[0].startTime").value("14:00"))
                .andExpect(jsonPath("$.data[0].typeLabel").value("Bloqueante"));
        mvc.perform(get(EVENTS + "/" + id).with(as("op@test.local", "OPERARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weekdays", contains(4)))
                .andExpect(jsonPath("$.data.version").value(0));
    }

    @Test
    void onlyCoordinationWrites() throws Exception {
        mvc.perform(post(EVENTS).with(as("s@test.local", "SUPERVISOR"))
                        .contentType(MediaType.APPLICATION_JSON).content(culturalThursdays("CAMPUS", null)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theRulesOfAnEventAreChecked() throws Exception {
        create("""
                {"name":"Fiestas Patrias","typeCode":"HOLIDAY","scope":"SECTOR","zoneId":%d,
                 "startDate":"2026-07-28","endDate":"2026-07-29"}""".formatted(sector))
                .andExpect(status().isUnprocessableEntity());
        create("""
                {"name":"Largo","typeCode":"BLOCKING","scope":"CAMPUS","startDate":"2026-01-01","endDate":"2027-01-03"}""")
                .andExpect(status().isUnprocessableEntity());
        create("""
                {"name":"Sin fin","typeCode":"BLOCKING","scope":"CAMPUS","startDate":"2026-11-10","endDate":"2026-11-11",
                 "startTime":"14:00"}""")
                .andExpect(status().isUnprocessableEntity());
        create("""
                {"name":"Ningún martes","typeCode":"BLOCKING","scope":"CAMPUS","startDate":"2027-03-17","endDate":"2027-03-22",
                 "weekdays":[2]}""")
                .andExpect(status().isUnprocessableEntity());
        create("""
                {"name":"Sector equivocado","typeCode":"BLOCKING","scope":"SECTOR","zoneId":%d,
                 "startDate":"2026-11-10","endDate":"2026-11-11"}""".formatted(section))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void anOldVersionIsRejectedAndDeletingRemovesEverything() throws Exception {
        long id = created(culturalThursdays("SECTION", section));
        String edit = culturalThursdays("SECTION", section).replace("\"weekdays\":[4]", "\"weekdays\":[4],\"version\":0")
                .replace("Jueves cultural", "Jueves cultural de Letras");

        mvc.perform(put(EVENTS + "/" + id).with(as(coordinator, "COORDINADOR"))
                .contentType(MediaType.APPLICATION_JSON).content(edit)).andExpect(status().isOk());
        mvc.perform(put(EVENTS + "/" + id).with(as(coordinator, "COORDINADOR"))
                .contentType(MediaType.APPLICATION_JSON).content(edit)).andExpect(status().isConflict());

        mvc.perform(delete(EVENTS + "/" + id).with(as(coordinator, "COORDINADOR"))).andExpect(status().isOk());
        mvc.perform(get(EVENTS).with(as(coordinator, "COORDINADOR")).param("from", "2026-11-01").param("to", "2026-11-30"))
                .andExpect(jsonPath("$.data[?(@.eventId == %d)]".formatted(id), empty()));
        check("2026-11-05", section, null, null).andExpect(jsonPath("$.data", empty()));
    }

    private ResultActions check(String date, Long zoneId, String startTime, String endTime) throws Exception {
        var request = get(EVENTS + "/check").with(as(coordinator, "COORDINADOR")).param("dates", date);
        if (zoneId != null) request.param("zoneIds", String.valueOf(zoneId));
        if (startTime != null) request.param("startTime", startTime).param("endTime", endTime);
        return mvc.perform(request).andExpect(status().isOk());
    }

    @Test
    void workOnATouchedGardenGetsAWarningThatDoesNotBlock() throws Exception {
        created(culturalThursdays("SECTION", section));

        check("2026-11-05", section, null, null)
                .andExpect(jsonPath("$.data[0].kind").value("CAMPUS_EVENT"))
                .andExpect(jsonPath("$.data[0].severity").value("WARNING"))
                .andExpect(jsonPath("$.data[0].text", containsString("de 14:00 a 18:00 hay Jueves cultural")));
        check("2026-11-04", section, null, null).andExpect(jsonPath("$.data", empty()));
        check("2026-11-05", neighbour, null, null).andExpect(jsonPath("$.data", empty()));
        check("2026-11-05", section, "10:00", "12:00").andExpect(jsonPath("$.data", empty()));
        check("2026-11-05", section, "15:00", "17:00").andExpect(jsonPath("$.data", hasSize(1)));
        check("2026-11-05", null, null, null).andExpect(jsonPath("$.data", empty()));
    }

    @Test
    void aHolidayWarnsEverywhereAndIsNotABusinessDay() throws Exception {
        created("""
                {"name":"Día de prueba","typeCode":"HOLIDAY","scope":"CAMPUS","startDate":"2026-11-06","endDate":"2026-11-06"}""");

        check("2026-11-06", neighbour, null, null)
                .andExpect(jsonPath("$.data[0].kind").value("HOLIDAY"))
                .andExpect(jsonPath("$.data[0].text", containsString("es feriado: Día de prueba")));
        // Jueves 5 y viernes 6 (feriado): un solo día hábil.
        assertThat(businessDays.count(Instant.parse("2026-11-05T15:00:00Z"), Instant.parse("2026-11-06T15:00:00Z"))).isEqualTo(1);
    }

    @Test
    void theMapShowsASectorEventAsABalloonAndACampusEventAsANotice() throws Exception {
        created("""
                {"name":"Feria de Ciencias","typeCode":"BLOCKING","scope":"SECTOR","zoneId":%d,
                 "startDate":"2026-11-04","endDate":"2026-11-04"}""".formatted(sector));
        created("""
                {"name":"Examen de admisión","typeCode":"BLOCKING","scope":"CAMPUS","startDate":"2026-11-04","endDate":"2026-11-04"}""");
        created("""
                {"name":"Charla de la mañana","typeCode":"BLOCKING","scope":"SECTION","zoneId":%d,
                 "startDate":"2026-11-04","endDate":"2026-11-04","startTime":"07:00","endTime":"09:00"}""".formatted(section));

        String body = mvc.perform(get("/api/v1/map/balloons").with(as("s@test.local", "SUPERVISOR")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode data = json.readTree(body).get("data");

        var names = new java.util.ArrayList<String>();
        for (JsonNode b : data.get("balloons")) {
            if (b.get("kind").asString().equals("BLOCKING_EVENT")) names.add(b.get("card").get("title").asString());
        }
        assertThat(names).containsExactly("Feria de Ciencias");
        assertThat(data.get("campusNotices").toString()).contains("Hoy: Examen de admisión (todo el día)");
    }
}
