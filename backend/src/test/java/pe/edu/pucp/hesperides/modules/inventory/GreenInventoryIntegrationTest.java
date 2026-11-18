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
 * (docs/modulos/inventario-verde.md).
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

    private static final String SPECIMENS = BASE + "/specimens/all";
    private static final String SPECIES = BASE + "/species/all";

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "true,  true,  87",
            "true,  false, 762",
            "false, true,  0",
            "false, false, 116",
    })
    void eachSpecimenSaysWhetherItsSpeciesIsCriticalAndWhetherItIsMeasured(boolean critical, boolean measured,
            int expected) throws Exception {
        // El navegador filtra por estas dos marcas (SPEC-119): los conteos son los del catastro.
        mockMvc.perform(get(SPECIMENS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.speciesCritical == %s && @.measured == %s)]".formatted(critical, measured),
                        hasSize(expected)));
    }

    @Test
    void theListBringsEveryActiveSpecimen() throws Exception {
        mockMvc.perform(get(SPECIMENS))
                .andExpect(jsonPath("$.data", hasSize(965)))
                .andExpect(jsonPath("$.data[0].speciesSlug").isString());
    }

    @Test
    void theSearchKeyOfASpecimenCarriesItsSpeciesNamesWithoutAccents() throws Exception {
        mockMvc.perform(get(SPECIMENS))
                .andExpect(jsonPath("$.data[?(@.searchKey =~ /.*cafeto.*/ && @.speciesCritical == false && @.measured == false)]",
                        hasSize(55)))
                .andExpect(jsonPath("$.data[?(@.code == 'EV-000001')].searchKey",
                        hasItem(startsWith("ev-000001 p01"))));
    }

    @Test
    void eachSpecimenCarriesTheVegetationTypeOfItsSpecies() throws Exception {
        mockMvc.perform(get(SPECIMENS))
                .andExpect(jsonPath("$.data[?(@.vegetationTypeCode == 'PALM')]", hasSize(250)))
                .andExpect(jsonPath("$.data[?(@.vegetationTypeCode == 'PALM')].speciesSlug",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.not("coffea-arabica"))));
    }

    @Test
    void speciesComeMostRepresentedFirstWithAPhotoOfTheirOwn() throws Exception {
        mockMvc.perform(get(SPECIES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(90)))
                .andExpect(jsonPath("$.data[0].slug").value("roystonea-regia"))
                .andExpect(jsonPath("$.data[0].family").value("Arecaceae"))
                .andExpect(jsonPath("$.data[0].imageUrl", startsWith("https://drive.google.com/thumbnail?id=")));
    }

    @Test
    void theSearchKeyOfASpeciesCarriesItsOtherColloquialNames() throws Exception {
        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data[?(@.searchKey =~ /.*palmera bruja.*/)].scientificName",
                        org.hamcrest.Matchers.contains("Syagrus romanzoffiana")))
                .andExpect(jsonPath("$.data[?(@.searchKey =~ /.*palmera bruja.*/)].otherNames[0]",
                        org.hamcrest.Matchers.contains("Palmera bruja")));
    }

    @Test
    void theSearchKeyIgnoresAccentsAndCase() throws Exception {
        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data[?(@.searchKey =~ /.*jacaranda.*/)].commonName", hasItem("Jacarandá")));
    }

    @Test
    void eachSpeciesCarriesItsVegetationType() throws Exception {
        mockMvc.perform(get(SPECIES))
                .andExpect(jsonPath("$.data[?(@.vegetationTypeCode == 'CLIMBER')].vegetationTypeName",
                        org.hamcrest.Matchers.contains("Trepadora")));
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
        mockMvc.perform(get(SPECIMENS))
                .andExpect(jsonPath("$.data[?(@.speciesSlug == 'delonix-regia')].code", hasItem(startsWith("EV-"))));
        mockMvc.perform(get(BASE + "/specimens/EV-000458"))
                .andExpect(jsonPath("$.data.dataSource").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.heightM", nullValue()))
                .andExpect(jsonPath("$.data.notes", containsString("Falta ubicarla")));
    }

    @Test
    void anUnknownSpecimenIsA404() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/EV-999999")).andExpect(status().isNotFound());
    }

    @Test
    void globalLocationsReturnsLocationsAcrossAllSpecies() throws Exception {
        mockMvc.perform(get(BASE + "/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }
}
