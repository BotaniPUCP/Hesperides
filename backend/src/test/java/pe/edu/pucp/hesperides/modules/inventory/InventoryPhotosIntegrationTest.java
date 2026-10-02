package pe.edu.pucp.hesperides.modules.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.inventory.service.InventoryPhotoService;
import pe.edu.pucp.hesperides.support.TestDatabase;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Fotos guardadas en nuestro almacenamiento (SPEC-002 §5.4, SPEC-103 D-07). */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InventoryPhotosIntegrationTest {

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
    private InventoryPhotoService photos;

    @Autowired
    private JdbcTemplate jdbc;

    private static byte[] png() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2000, 1500, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    @Test
    void aStoredPhotoReplacesTheDriveLinkAndIsServedInTwoSizes() throws Exception {
        photos.attachToSpecimen("EV-000001", png(), "p01.png", null, "admin@pucp.edu.pe");

        // La base guarda la clave, nunca el binario.
        String key = jdbc.queryForObject("SELECT storage_key FROM green_element_attachments a "
                + "JOIN green_elements e ON e.id = a.green_element_id WHERE e.code = 'EV-000001'", String.class);
        assertThat(key).startsWith("green-elements/EV-000001/");

        String thumb = mockMvc.perform(get("/api/v1/green-inventory/specimens/EV-000001"))
                .andExpect(jsonPath("$.data.thumbnailUrl", startsWith("/files/green-elements/")))
                .andReturn().getResponse().getContentAsString();
        String path = thumb.replaceAll(".*\"thumbnailUrl\":\"(/files/[^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/v1" + path))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"));
    }

    @Test
    void theSpeciesUsesItsSpecimenPhotoWhenItHasNoGenericOne() throws Exception {
        photos.attachToSpecimen("EV-000001", png(), "p01.png", null, "admin@pucp.edu.pe");

        mockMvc.perform(get("/api/v1/green-inventory/species/roystonea-regia"))
                .andExpect(jsonPath("$.data.imageUrl", startsWith("/files/green-elements/")));
    }

    @Test
    void aGenericSpeciesPhotoWinsOverTheSpecimenOne() throws Exception {
        photos.attachToSpecimen("EV-000001", png(), "p01.png", null, "admin@pucp.edu.pe");
        photos.setSpeciesPhoto("roystonea-regia", png(), null, "admin@pucp.edu.pe");

        mockMvc.perform(get("/api/v1/green-inventory/species/roystonea-regia"))
                .andExpect(jsonPath("$.data.imageUrl", startsWith("/files/species/")));
    }

    @Test
    void anUnknownFileIsA404() throws Exception {
        mockMvc.perform(get("/api/v1/files/green-elements/999999")).andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void onlyAnAdminRunsThePhotoSync() throws Exception {
        mockMvc.perform(post("/api/v1/green-inventory/photos/sync")).andExpect(status().isForbidden());
    }
}
