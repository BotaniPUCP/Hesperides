package pe.edu.pucp.hesperides.modules.imports;

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
import pe.edu.pucp.hesperides.modules.imports.service.ImportLock;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;
import pe.edu.pucp.hesperides.support.TestDatabase;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Varias fotos por especie, con orden y crédito (SPEC-104). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
class SpeciesPhotoGalleryIntegrationTest {

    private static final String SPECIES = "/api/v1/green-inventory/species/schinus-molle";
    private static final String HEADER = "nombre_cientifico;foto;orden;autor;licencia;fuente\n";

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

    @Autowired
    private ImportLock importLock;

    static byte[] png() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(600, 400, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    private static byte[] zip(String... names) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(out)) {
            for (String name : names) {
                z.putNextEntry(new ZipEntry(name));
                z.write(png());
                z.closeEntry();
            }
        }
        return out.toByteArray();
    }

    private ResultActions preview(String csv, byte[] zip) throws Exception {
        return mockMvc.perform(multipart("/api/v1/imports/species-photos/preview")
                .file(new MockMultipartFile("file", "f.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                .file(new MockMultipartFile("photos", "f.zip", "application/zip", zip)));
    }

    private void load(String csv, String... files) throws Exception {
        String body = preview(csv, zip(files)).andReturn().getResponse().getContentAsString();
        long batch = Long.parseLong(body.replaceAll(".*\"batchId\":(\\d+).*", "$1"));
        mockMvc.perform(post("/api/v1/imports/" + batch + "/confirm")).andExpect(status().isOk());
    }

    private int activePhotos() {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM species_photos p JOIN species s ON s.id = p.species_id "
                + "WHERE s.slug = 'schinus-molle' AND p.deleted_at IS NULL", Integer.class);
        return n == null ? 0 : n;
    }

    @Test
    void aSpeciesShowsItsPhotosInOrderWithTheirCredit() throws Exception {
        load(HEADER + """
                Schinus molle;b.png;2;Ana Pérez;CC BY 4.0;https://commons.wikimedia.org/wiki/File:B.jpg
                Schinus molle;a.png;1;;CC0;
                Schinus molle;c.png;3;Luis Díaz;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:C.jpg
                """, "a.png", "b.png", "c.png");

        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data.imageSource").value("SPECIES"))
                .andExpect(jsonPath("$.data.photos", hasSize(3)))
                .andExpect(jsonPath("$.data.photos[0].license").value("CC0"))
                .andExpect(jsonPath("$.data.photos[0].author").value(nullValue()))
                .andExpect(jsonPath("$.data.photos[1].author").value("Ana Pérez"))
                .andExpect(jsonPath("$.data.photos[1].sourceUrl").value("https://commons.wikimedia.org/wiki/File:B.jpg"))
                .andExpect(jsonPath("$.data.photos[2].author").value("Luis Díaz"))
                .andExpect(jsonPath("$.data.photos[*].imageUrl", everyItem(matchesPattern("/files/species/\\d+\\?size=full"))))
                .andExpect(jsonPath("$.data.imageUrl", matchesPattern("/files/species/\\d+\\?size=thumb")));
    }

    @Test
    void aNewFileReplacesTheWholeSetOfTheSpecies() throws Exception {
        load(HEADER + "Schinus molle;a.png;;;;\nSchinus molle;b.png;;;;\nSchinus molle;c.png;;;;\n", "a.png", "b.png", "c.png");

        preview(HEADER + "Schinus molle;d.png;;;;\nSchinus molle;e.png;;;;\n", zip("d.png", "e.png"))
                .andExpect(jsonPath("$.data.photoSets[0].species").value("Schinus molle"))
                .andExpect(jsonPath("$.data.photoSets[0].current").value(3))
                .andExpect(jsonPath("$.data.photoSets[0].incoming").value(2));
        load(HEADER + "Schinus molle;d.png;;;;\nSchinus molle;e.png;;;;\n", "d.png", "e.png");

        assertThat(activePhotos()).isEqualTo(2);
        mockMvc.perform(get(SPECIES)).andExpect(jsonPath("$.data.photos", hasSize(2)));
    }

    @Test
    void theFormAddsAPhotoAtTheEnd() throws Exception {
        load(HEADER + "Schinus molle;a.png;;Ana;CC0;\nSchinus molle;b.png;;;;\n", "a.png", "b.png");

        mockMvc.perform(multipart(SPECIES + "/photo").file(new MockMultipartFile("photo", "n.png", "image/png", png())))
                .andExpect(status().isOk());

        assertThat(activePhotos()).isEqualTo(3);
        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data.photos[0].author").value("Ana"))
                .andExpect(jsonPath("$.data.photos[2].license").value(nullValue()));
    }

    @Test
    void withoutOwnPhotosTheSpeciesFallsBackToASpecimenPhoto() throws Exception {
        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data.imageSource").value("SPECIMEN"))
                .andExpect(jsonPath("$.data.photos", hasSize(0)));
    }

    @Test
    void theSpeciesListOnlyCarriesTheMainPhoto() throws Exception {
        load(HEADER + "Schinus molle;a.png;;;;\nSchinus molle;b.png;;;;\n", "a.png", "b.png");

        mockMvc.perform(get("/api/v1/green-inventory/species").param("search", "Schinus"))
                .andExpect(jsonPath("$.data.content[0].imageUrl", startsWith("/files/species/")))
                .andExpect(jsonPath("$.data.content[0].photos", hasSize(0)));
    }

    @Test
    void aFormPhotoOver25MbIsRejected() throws Exception {
        byte[] tooBig = new byte[(int) UploadLimits.MAX_PHOTO_BYTES + 1];

        mockMvc.perform(multipart(SPECIES + "/photo").file(new MockMultipartFile("photo", "big.jpg", "image/jpeg", tooBig)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The photo is larger than 25 MB"));
    }

    @Test
    void anImportWhileAnotherRunsIsAConflict() {
        importLock.run(() -> {
            try {
                preview(HEADER + "Schinus molle;a.png;;;;\n", zip("a.png")).andExpect(status().isConflict());
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            return null;
        });
    }
}
