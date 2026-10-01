package pe.edu.pucp.hesperides.modules.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El inventario verde contra PostGIS real con la carga de V014: las especies
 * del catastro limpias, sus 965 ejemplares y la sección calculada por posición.
 * Todas las peticiones van sin sesión: el inventario es público por ahora
 * (docs/inventario-verde/README.md).
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class GreenInventoryIntegrationTest {

    private static final String BASE = "/api/v1/green-inventory";

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

    @Test
    void theSummaryCountsTheLoadedCatastroWithoutASession() throws Exception {
        mockMvc.perform(get(BASE + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSpecies").value(90))
                .andExpect(jsonPath("$.data.totalSpecimens").value(965))
                .andExpect(jsonPath("$.data.vegetationTypes", hasSize(9)))
                .andExpect(jsonPath("$.data.vegetationTypes[?(@.code == 'PALM')].count").value(hasItem(250)));
    }

    @Test
    void speciesComeMostRepresentedFirstWithAPhotoOfTheirOwn() throws Exception {
        mockMvc.perform(get(BASE + "/species").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page.totalElements").value(90))
                .andExpect(jsonPath("$.data.content[0].slug").value("roystonea-regia"))
                .andExpect(jsonPath("$.data.content[0].family").value("Arecaceae"))
                .andExpect(jsonPath("$.data.content[0].imageUrl", startsWith("https://drive.google.com/thumbnail?id=")));
    }

    @Test
    void aSpeciesIsFoundByAnotherOfItsColloquialNames() throws Exception {
        mockMvc.perform(get(BASE + "/species").param("search", "palmera bruja"))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].scientificName").value("Syagrus romanzoffiana"))
                .andExpect(jsonPath("$.data.content[0].otherNames[0]").value("Palmera bruja"));
    }

    @Test
    void theSearchIgnoresAccentsAndCase() throws Exception {
        mockMvc.perform(get(BASE + "/species").param("search", "JACARANDA"))
                .andExpect(jsonPath("$.data.content[0].commonName").value("Jacarandá"));
    }

    @Test
    void speciesAreFilteredByVegetationType() throws Exception {
        mockMvc.perform(get(BASE + "/species").param("vegetationType", "CLIMBER"))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].vegetationTypeName").value("Trepadora"));
    }

    @Test
    void aSpeciesIsAddressedByItsSlug() throws Exception {
        mockMvc.perform(get(BASE + "/species/ficus-benjamina-variegata"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scientificName").value("Ficus benjamina 'Variegata'"))
                .andExpect(jsonPath("$.data.specimenCount").value(2));
    }

    @Test
    void anUnknownSpeciesIsA404() throws Exception {
        mockMvc.perform(get(BASE + "/species/no-existe")).andExpect(status().isNotFound());
    }

    @Test
    void specimensAreFilteredByTheirSourceLocation() throws Exception {
        mockMvc.perform(get(BASE + "/species/roystonea-regia/specimens")
                        .param("location", "Mecánica").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].sourceLocation").value(org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.is("Mecánica"))));
    }

    @Test
    void specimensAreSortedByReferenceInNaturalOrder() throws Exception {
        // p2 antes que p10: el orden alfabético puro los invertiría.
        mockMvc.perform(get(BASE + "/species/coffea-arabica/specimens").param("sort", "reference").param("size", "3"))
                .andExpect(jsonPath("$.data.content[0].sourceReference").value("c1"))
                .andExpect(jsonPath("$.data.content[1].sourceReference").value("c2"));
    }

    @Test
    void anUnsupportedSortIsRejected() throws Exception {
        mockMvc.perform(get(BASE + "/species/coffea-arabica/specimens").param("sort", "photo_url; drop table x"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theLocationsOfASpeciesCarryTheirCount() throws Exception {
        mockMvc.perform(get(BASE + "/species/coffea-arabica/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.location == 'Biblioteca Central')].count").value(hasItem(25)));
    }

    @Test
    void aMeasuredPalmShowsItsMeasuresAndItsSection() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/EV-000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sourceReference").value("p01"))
                .andExpect(jsonPath("$.data.dataSource").value("MEASURED"))
                .andExpect(jsonPath("$.data.heightM").value(7.5))
                .andExpect(jsonPath("$.data.dbhCm").value(150.0))
                .andExpect(jsonPath("$.data.isBanded").value(true))
                .andExpect(jsonPath("$.data.species.slug").value("roystonea-regia"))
                .andExpect(jsonPath("$.data.section.code").value("AV-0312"));
    }

    @Test
    void aSpecimenOutsideEverySectionHasNoSection() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/EV-000009"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.section", nullValue()));
    }

    @Test
    void anUnmeasuredTreeIsUnknownAndHasNoHeight() throws Exception {
        mockMvc.perform(get(BASE + "/species/delonix-regia/specimens").param("size", "1"))
                .andExpect(jsonPath("$.data.content[0].code", startsWith("EV-")));
        mockMvc.perform(get(BASE + "/specimens/EV-000458"))
                .andExpect(jsonPath("$.data.dataSource").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.heightM", nullValue()))
                .andExpect(jsonPath("$.data.notes", containsString("Falta ubicarla")));
    }

    @Test
    void anUnknownSpecimenIsA404() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/EV-999999")).andExpect(status().isNotFound());
    }
}
