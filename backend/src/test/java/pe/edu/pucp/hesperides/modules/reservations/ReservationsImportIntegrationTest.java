package pe.edu.pucp.hesperides.modules.reservations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
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

/** Registro masivo de reservas en el ciclo común de cargas (SPEC-107 §5.4). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "importador@pucp.edu.pe", authorities = "COORDINADOR")
class ReservationsImportIntegrationTest {

    private static final String IMPORTS = "/api/v1/imports";
    private static final String HEADER = "jardin;pedido_de;solicitante;para;responsable;fecha;inicio;fin;motivo\n";
    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu");

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

    private LocalDate day;
    private long rosalesId;

    @BeforeEach
    void data() {
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT 'importador@pucp.edu.pe', 'x', 'Prueba', 'Carga', i.id
                  FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = 'COORDINADOR'""");
        day = LocalDate.now(LIMA).plusDays(2);
        rosalesId = jdbc.queryForObject("""
                SELECT id FROM places WHERE name = 'Jardín Rosales' AND deleted_at IS NULL""", Long.class);
        jdbc.update("""
                INSERT INTO places (name, kind_item_id, category_item_id)
                SELECT 'Lugar no prestable', k.id, c.id FROM catalog_items k
                  JOIN catalog_types kt ON kt.id = k.catalog_type_id AND kt.code = 'PLACE_KIND' AND k.code = 'OUTDOOR'
                  CROSS JOIN (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                               WHERE ct.code = 'REFERENCE_CATEGORY' LIMIT 1) c""");
        organization("Facultad de Letras", "Letras");
        organization("CF Psicología", null);
        long letras = jdbc.queryForObject(
                "SELECT id FROM organizations WHERE name = 'Facultad de Letras'", Long.class);
        long psicologia = jdbc.queryForObject(
                "SELECT id FROM organizations WHERE name = 'CF Psicología'", Long.class);
        contact("Juan Diego Villasante", letras, "Delegado");
        contact("María Quispe", psicologia, null);
        // Dos personas con el mismo nombre en organizaciones distintas: el nombre ambiguo falla la fila.
        contact("Pedro Solari", letras, null);
        long other = jdbc.queryForObject("""
                INSERT INTO organizations (name, type_item_id)
                SELECT 'Facultad de Ciencias', i.id FROM catalog_items i
                  JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT' RETURNING id""", Long.class);
        contact("Pedro Solari", other, null);
    }

    private void organization(String name, String alias) {
        jdbc.update("""
                INSERT INTO organizations (name, type_item_id)
                SELECT ?, i.id FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND i.code = 'PUCP_UNIT'""", name);
        if (alias != null) {
            jdbc.update("INSERT INTO organization_aliases (organization_id, alias) "
                    + "SELECT id, ? FROM organizations WHERE name = ?", alias, name);
        }
    }

    private void contact(String fullName, long organizationId, String role) {
        long contactId = jdbc.queryForObject(
                "INSERT INTO contacts (full_name) VALUES (?) RETURNING id", Long.class, fullName);
        jdbc.update("INSERT INTO contact_organizations (contact_id, organization_id, role) VALUES (?, ?, ?)",
                contactId, organizationId, role);
    }

    private ResultActions preview(String csv) throws Exception {
        csv = csv.replace("{fecha}", DATE.format(day));
        MockMultipartFile file = new MockMultipartFile("file", "reservas.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));
        return mockMvc.perform(multipart(IMPORTS + "/reservations/preview").file(file));
    }

    private static long batchIdOf(ResultActions preview) throws Exception {
        return Long.parseLong(preview.andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"batchId\":(\\d+).*", "$1"));
    }

    private ResultActions confirm(long batchId) throws Exception {
        return mockMvc.perform(post(IMPORTS + "/" + batchId + "/confirm"));
    }

    private int reservations() {
        return jdbc.queryForObject("SELECT count(*) FROM garden_reservations WHERE deleted_at IS NULL", Integer.class);
    }

    private static String row(String garden, String requestedBy, String requester, String requestedFor,
            String responsible, String start, String end) {
        return rowOn(null, garden, requestedBy, requester, requestedFor, responsible, start, end);
    }

    /** Sin fecha, la fila usa el día de la prueba: preview() reemplaza {fecha}. */
    private static String rowOn(String date, String garden, String requestedBy, String requester,
            String requestedFor, String responsible, String start, String end) {
        return garden + ";" + requestedBy + ";" + requester + ";" + requestedFor + ";" + responsible
                + ";" + (date == null ? "{fecha}" : date) + ";" + start + ";" + end + ";Feria\n";
    }

    private static String when(int hour) {
        return String.format("%02d:00", hour);
    }

    @Nested
    class Templates {

        @Test
        void theTemplateIsTheDocumentedOne() throws Exception {
            byte[] documented = Files.readAllBytes(Path.of("src", "main", "resources", "imports", "templates", "reservas.csv"));
            mockMvc.perform(get(IMPORTS + "/templates/reservations")).andExpect(status().isOk())
                    .andExpect(content().bytes(documented));
        }
    }

    @Nested
    class Preview {

        @Test
        void thePreviewResolvesTheGardenAliasAndTheOrganizationAliasWithoutWriting() throws Exception {
            preview(HEADER + row("Jardín ROSALES (FARES)", "Letras", "Juan Diego Villasante", "", "",
                    when(10), when(14)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.kind").value("reservations"))
                    .andExpect(jsonPath("$.data.rows[*].action", contains("CREATE")))
                    .andExpect(jsonPath("$.data.rows[0].garden").value("Jardín Rosales"))
                    .andExpect(jsonPath("$.data.rows[0].organization").value("Facultad de Letras"))
                    .andExpect(jsonPath("$.data.toCreate").value(1))
                    .andExpect(jsonPath("$.data.errors").value(0))
                    .andExpect(jsonPath("$.data.canConfirm").value(true));

            assertThat(reservations()).isZero();
        }

        @Test
        void anEmptyResponsibleBecomesTheRequester() throws Exception {
            preview(HEADER + row("Jardín Rosales", "Facultad de Letras", "Juan Diego Villasante", "", "",
                    when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].action").value("CREATE"));
        }

        @Test
        void aResponsibleFromAnotherOrganizationIsCreated() throws Exception {
            preview(HEADER + row("Jardín Rosales", "Facultad de Letras", "Juan Diego Villasante",
                    "CF Psicología", "María Quispe", when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].action").value("CREATE"));
        }

        @Test
        void aGardenThatIsNotReservableIsAnErrorWithItsLineAndColumn() throws Exception {
            preview(HEADER + row("Lugar no prestable", "Letras", "Juan Diego Villasante", "", "",
                    when(10), when(14)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.rows[0].issues[0].line").value(2))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("jardin"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("GARDEN_NOT_RESERVABLE"))
                    .andExpect(jsonPath("$.data.canConfirm").value(false));
        }

        @Test
        void anUnknownGardenOrOrganizationIsAnError() throws Exception {
            preview(HEADER
                    + row("Jardín Inventado", "Letras", "Juan Diego Villasante", "", "", when(10), when(14))
                    + row("Jardín Rosales", "Organización Inventada", "Juan Diego Villasante", "", "",
                            when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("UNKNOWN_GARDEN"))
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("UNKNOWN_ORGANIZATION"))
                    .andExpect(jsonPath("$.data.errors").value(2));
        }

        @Test
        void aRequesterOutsideTheRequestingOrganizationIsAnError() throws Exception {
            preview(HEADER + row("Jardín Rosales", "Letras", "María Quispe", "", "", when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("solicitante"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("UNKNOWN_CONTACT"));
        }

        @Test
        void anUnknownResponsibleIsAnErrorAndAnAmbiguousNameToo() throws Exception {
            preview(HEADER
                    + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "Nadie",
                            when(10), when(14))
                    + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "Pedro Solari",
                            when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("UNKNOWN_CONTACT"))
                    .andExpect(jsonPath("$.data.rows[1].issues[0].code").value("AMBIGUOUS_CONTACT"))
                    .andExpect(jsonPath("$.data.errors").value(2));
        }

        @Test
        void anUnreadableDateIsAnErrorOfThatRow() throws Exception {
            preview(HEADER + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "",
                    "10.00", when(14)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("inicio"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("DATE_FORMAT"))
                    .andExpect(jsonPath("$.data.errors").value(1));
        }

        @Test
        void anUnreadableDayIsAnErrorOfThatRow() throws Exception {
            preview(HEADER + rowOn("2026-11-13", "Jardín Rosales", "Letras", "Juan Diego Villasante", "", "",
                    when(10), when(14)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("fecha"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("DATE_FORMAT"));
        }

        @Test
        void aReservationThatWouldCrossMidnightEndsBeforeItStarts() throws Exception {
            preview(HEADER + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "",
                    when(22), when(1)))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].column").value("fin"))
                    .andExpect(jsonPath("$.data.rows[0].issues[0].code").value("END_BEFORE_START"));
        }

        @Test
        void overlappingReservationsArePreviewedAsCreatedWithWarnings() throws Exception {
            long batch = batchIdOf(preview(HEADER + row("Jardín Rosales", "Letras", "Juan Diego Villasante",
                    "", "", when(10), when(14))).andExpect(jsonPath("$.data.rows[0].action").value("CREATE")));
            confirm(batch).andExpect(status().isOk());

            preview(HEADER + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "",
                    when(11), when(13)))
                    .andExpect(jsonPath("$.data.rows[0].action").value("WARNING"))
                    .andExpect(jsonPath("$.data.rows[0].warnings[0].kind").value("OVERLAPPING_RESERVATION"))
                    .andExpect(jsonPath("$.data.toWarning").value(1))
                    .andExpect(jsonPath("$.data.canConfirm").value(true));
        }
    }

    @Nested
    class Confirming {

        @Test
        void confirmingCreatesTheReviewedRowsAndRemembersTheirBatch() throws Exception {
            long batch = batchIdOf(preview(HEADER
                    + row("Jardín ROSALES (FARES)", "Letras", "Juan Diego Villasante", "", "",
                            when(10), when(14))
                    + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "",
                            when(15), when(17))));

            confirm(batch).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.batchId").value(batch))
                    .andExpect(jsonPath("$.data.created").value(2))
                    .andExpect(jsonPath("$.data.createdCodes[0]", matchesPattern("RES-\\d{4}")));

            assertThat(jdbc.queryForObject("SELECT count(*) FROM garden_reservations WHERE import_batch_id = ?",
                    Integer.class, batch)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT status FROM import_batches WHERE id = ?", String.class, batch))
                    .isEqualTo("CONFIRMED");
        }

        @Test
        void aFileWithOneErrorSavesNothing() throws Exception {
            long batch = batchIdOf(preview(HEADER
                    + row("Jardín Rosales", "Letras", "Juan Diego Villasante", "", "", when(10), when(14))
                    + row("Lugar no prestable", "Letras", "Juan Diego Villasante", "", "", when(10), when(14)))
                    .andExpect(jsonPath("$.data.canConfirm").value(false)));

            confirm(batch).andExpect(status().isUnprocessableEntity());
            assertThat(reservations()).isZero();
        }

        @Test
        void aPastReservationIsAllowedAndComesOutFinished() throws Exception {
            LocalDate past = day.minusDays(4);
            long batch = batchIdOf(preview(HEADER + rowOn(DATE.format(past), "Jardín Rosales", "Letras",
                    "Juan Diego Villasante", "", "", when(10), when(14))));
            confirm(batch).andExpect(status().isOk());

            assertThat(jdbc.queryForObject("SELECT starts_at FROM garden_reservations", java.time.OffsetDateTime.class))
                    .isNotNull();
            mockMvc.perform(get("/api/v1/reservations").param("from", past.toString()).param("to", past.toString()))
                    .andExpect(jsonPath("$.data.items[0].state").value("FINISHED"));
        }
    }
}
