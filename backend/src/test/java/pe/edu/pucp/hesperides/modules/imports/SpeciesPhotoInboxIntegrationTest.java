package pe.edu.pucp.hesperides.modules.imports;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Carga inicial de fotos de especie desde la bandeja del servidor (SPEC-104 D-05, D-06). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class SpeciesPhotoInboxIntegrationTest {

    private static final String LOAD = "/api/v1/green-inventory/species-photos/load-inbox";
    private static final String HEADER = "nombre_cientifico;foto;orden;autor;licencia;fuente\n";
    private static final Path INBOX = createInbox();
    private static final Path FOLDER = INBOX.resolve("species-photos");

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("hesperides.storage.inbox-dir", INBOX::toString);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private static Path createInbox() {
        try {
            return Files.createTempDirectory("hesperides-inbox");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @BeforeEach
    @AfterEach
    void emptyTheInbox() throws IOException {
        Files.createDirectories(FOLDER);
        try (Stream<Path> files = Files.list(FOLDER)) {
            for (Path f : files.toList()) Files.delete(f);
        }
    }

    private static void put(String csv, String... photos) throws IOException {
        Files.writeString(FOLDER.resolve("fotos-especies.csv"), HEADER + csv, StandardCharsets.UTF_8);
        for (String name : photos) {
            Files.write(FOLDER.resolve(name), SpeciesPhotoGalleryIntegrationTest.png());
        }
    }

    private static long filesLeft() throws IOException {
        try (Stream<Path> files = Files.list(FOLDER)) {
            return files.count();
        }
    }

    private ResultActions load() throws Exception {
        return mockMvc.perform(post(LOAD)).andExpect(status().isOk());
    }

    private int photosOf(String slug) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM species_photos p JOIN species s ON s.id = p.species_id "
                + "WHERE s.slug = ? AND p.deleted_at IS NULL", Integer.class, slug);
        return n == null ? 0 : n;
    }

    @Test
    void loadingMovesThePhotosIntoTheSystem() throws Exception {
        put("""
                Schinus molle;schinus-molle-1.jpg;1;Ana;CC BY 4.0;https://commons.wikimedia.org/wiki/File:A.jpg
                Schinus molle;schinus-molle-2.jpg;2;;CC0;
                Tipuana tipu;tipuana-tipu-1.jpg;1;Luis;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:T.jpg
                """, "schinus-molle-1.jpg", "schinus-molle-2.jpg", "tipuana-tipu-1.jpg");

        load().andExpect(jsonPath("$.data.loaded").value(3))
                .andExpect(jsonPath("$.data.species").value(2))
                .andExpect(jsonPath("$.data.failures", hasSize(0)))
                .andExpect(jsonPath("$.data.remaining").value(0));

        // Mover, no copiar: la bandeja queda vacía, incluido su CSV.
        assertThat(filesLeft()).isZero();
        assertThat(photosOf("schinus-molle")).isEqualTo(2);
        mockMvc.perform(get("/api/v1/green-inventory/species/tipuana-tipu"))
                .andExpect(jsonPath("$.data.photos[0].author").value("Luis"));
    }

    @Test
    void aBrokenPhotoKeepsItsSpeciesUntouchedAndItsFilesInTheInbox() throws Exception {
        put("Schinus molle;s-1.jpg;;;;\nSchinus molle;s-2.jpg;;;;\nTipuana tipu;t-1.jpg;;;;\n", "s-1.jpg", "t-1.jpg");
        Files.write(FOLDER.resolve("s-2.jpg"), new byte[] {1, 2, 3});

        load().andExpect(jsonPath("$.data.loaded").value(1))
                .andExpect(jsonPath("$.data.species").value(1))
                .andExpect(jsonPath("$.data.failures[0].file").value("s-2.jpg"))
                .andExpect(jsonPath("$.data.remaining").value(2));

        assertThat(photosOf("schinus-molle")).isZero();
        assertThat(Files.exists(FOLDER.resolve("s-1.jpg"))).isTrue();
        assertThat(Files.exists(FOLDER.resolve("t-1.jpg"))).isFalse();
        // El CSV se queda mientras haya algo por cargar.
        assertThat(Files.exists(FOLDER.resolve("fotos-especies.csv"))).isTrue();
    }

    @Test
    void aFileNotListedInTheCsvIsReportedAndKept() throws Exception {
        put("Schinus molle;s-1.jpg;;;;\n", "s-1.jpg", "suelta.jpg");

        load().andExpect(jsonPath("$.data.loaded").value(1))
                .andExpect(jsonPath("$.data.failures[0].file").value("suelta.jpg"));

        assertThat(Files.exists(FOLDER.resolve("suelta.jpg"))).isTrue();
    }

    @Test
    void anUnknownSpeciesIsReportedAndItsPhotosKept() throws Exception {
        put("Planta inventada;x-1.jpg;;;;\n", "x-1.jpg");

        load().andExpect(jsonPath("$.data.loaded").value(0))
                .andExpect(jsonPath("$.data.failures[0].file").value("x-1.jpg"));

        assertThat(Files.exists(FOLDER.resolve("x-1.jpg"))).isTrue();
    }

    @Test
    void anEmptyInboxLoadsNothing() throws Exception {
        load().andExpect(jsonPath("$.data.loaded").value(0)).andExpect(jsonPath("$.data.remaining").value(0));
    }

    @Test
    void runningItAgainResumesWhereItStopped() throws Exception {
        put("Schinus molle;s-1.jpg;;;;\nTipuana tipu;t-1.jpg;;;;\n", "t-1.jpg");

        // s-1.jpg ya no está: su especie se cargó en una ejecución anterior y se salta.
        load().andExpect(jsonPath("$.data.loaded").value(1)).andExpect(jsonPath("$.data.failures", hasSize(0)));
        assertThat(filesLeft()).isZero();
    }

    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void onlyAnAdminLoadsTheInbox() throws Exception {
        mockMvc.perform(post(LOAD)).andExpect(status().isForbidden());
    }
}
