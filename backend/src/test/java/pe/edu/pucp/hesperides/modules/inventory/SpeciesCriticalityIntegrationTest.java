package pe.edu.pucp.hesperides.modules.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.support.TestDatabase;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-105 §4.2, §5.1, §5.2, §5.4 y §5.5 contra PostGIS real con los datos migrados. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class SpeciesCriticalityIntegrationTest {

    private static final String BASE = "/api/v1/green-inventory";
    private static final RequestPostProcessor COORDINATOR = user("coordinator@test.local").authorities(() -> "COORDINADOR");
    private static final RequestPostProcessor SUPERVISOR = user("supervisor@test.local").authorities(() -> "SUPERVISOR");

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper json;
    @MockitoSpyBean private AuditService audit;

    private String specimenOf(String slug) {
        return jdbc.queryForObject("""
                SELECT e.code FROM green_elements e JOIN species s ON s.id = e.species_id
                 WHERE s.slug = ? AND e.deleted_at IS NULL AND e.is_active AND e.data_source <> 'MEASURED'
                 ORDER BY e.code LIMIT 1""", String.class, slug);
    }

    private ResultActions register(Map<String, Object> form, RequestPostProcessor actor) throws Exception {
        var data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(form));
        return mockMvc.perform(multipart(BASE + "/species").file(data).with(actor));
    }

    private ResultActions edit(String slug, Map<String, Object> form, RequestPostProcessor actor) throws Exception {
        return mockMvc.perform(put(BASE + "/species/" + slug).with(actor)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(form)));
    }

    private static Map<String, Object> form(String scientificName, String typeCode) {
        var form = new LinkedHashMap<String, Object>();
        form.put("scientificName", scientificName);
        form.put("commonName", "Nombre de prueba");
        form.put("vegetationTypeCode", typeCode);
        return form;
    }

    private static Map<String, Object> withAverages(Map<String, Object> form) {
        form.put("referenceHeightM", 2.5);
        form.put("referenceHeightSourceCode", "BOTANICAL_SHEET");
        form.put("referenceCrownRadiusM", 1.5);
        form.put("referenceCrownRadiusSourceCode", "TEAM_ESTIMATE");
        return form;
    }

    private Boolean isCritical(String slug) {
        return jdbc.queryForObject("SELECT is_critical FROM species WHERE slug = ?", Boolean.class, slug);
    }

    @Test
    void migrationLeavesTwelveNonCriticalSpeciesWith116Specimens() {
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM species
                 WHERE NOT is_critical AND deleted_at IS NULL AND scientific_name NOT LIKE 'Testus %'""", Integer.class))
                .isEqualTo(12);
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM green_elements e JOIN species s ON s.id = e.species_id
                 WHERE NOT s.is_critical AND e.deleted_at IS NULL AND e.is_active""", Integer.class))
                .isEqualTo(116);
    }

    @Test
    void migrationStoresEachAverageWithItsOwnSource() throws Exception {
        mockMvc.perform(get(BASE + "/species/jarava-ichu"))
                .andExpect(jsonPath("$.data.critical").value(false))
                .andExpect(jsonPath("$.data.referenceHeightM").value(0.7))
                .andExpect(jsonPath("$.data.referenceHeightSourceCode").value("BOTANICAL_SHEET"))
                .andExpect(jsonPath("$.data.referenceCrownRadiusM").value(0.25))
                .andExpect(jsonPath("$.data.referenceCrownRadiusSourceCode").value("TEAM_ESTIMATE"))
                .andExpect(jsonPath("$.data.unmeasuredSpecimenCount").value(39));
        mockMvc.perform(get(BASE + "/species/roystonea-regia"))
                .andExpect(jsonPath("$.data.unmeasuredSpecimenCount").value(130));
    }

    @Test
    void migrationMarksTheFiveShrubsAndClimberAsCriticalKeepingTheirAverages() throws Exception {
        for (String slug : List.of("bougainvillea-glabra", "nerium-oleander", "vachellia-farnesiana",
                "euphorbia-umbellata", "dracaena-fragrans")) {
            assertThat(isCritical(slug)).as(slug).isTrue();
        }
        mockMvc.perform(get(BASE + "/species/vachellia-farnesiana"))
                .andExpect(jsonPath("$.data.referenceHeightM").value(5.0))
                .andExpect(jsonPath("$.data.referenceCrownRadiusM").value(2.5));
    }

    @Test
    void migrationCorrectsTheTwoMisclassifiedSpecies() throws Exception {
        mockMvc.perform(get(BASE + "/species/matthiola-incana"))
                .andExpect(jsonPath("$.data.vegetationTypeCode").value("HERB"));
        mockMvc.perform(get(BASE + "/species/chlorophytum-comosum"))
                .andExpect(jsonPath("$.data.vegetationTypeCode").value("HERB"));
        mockMvc.perform(get(BASE + "/summary"))
                .andExpect(jsonPath("$.data.vegetationTypes[?(@.code == 'SUCCULENT')].count").value(hasItem(0)));
    }

    @Test
    void migrationHidesTrunkAndDbhExceptForCriticalWoodySpecies() throws Exception {
        mockMvc.perform(get(BASE + "/species/coffea-arabica"))
                .andExpect(jsonPath("$.data.usesTrunkHeight").value(false))
                .andExpect(jsonPath("$.data.usesDbh").value(false));
        mockMvc.perform(get(BASE + "/species/bougainvillea-glabra"))
                .andExpect(jsonPath("$.data.usesDbh").value(false));
        mockMvc.perform(get(BASE + "/species/dracaena-fragrans"))
                .andExpect(jsonPath("$.data.usesDbh").value(true));
        mockMvc.perform(get(BASE + "/species/roystonea-regia"))
                .andExpect(jsonPath("$.data.usesTrunkHeight").value(true));
    }

    @Test
    void databaseRejectsANonCriticalSpeciesWithoutAverage() {
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE species SET reference_height_m = NULL, reference_height_source_item_id = NULL
                 WHERE slug = 'coffea-arabica'"""))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void unmeasuredSpecimenOfNonCriticalSpeciesShowsTheAverageAsNotMeasured() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/" + specimenOf("coffea-arabica")))
                .andExpect(jsonPath("$.data.speciesCritical").value(false))
                .andExpect(jsonPath("$.data.measurementStatus").value("REFERENCE"))
                .andExpect(jsonPath("$.data.heightM").value(nullValue()))
                .andExpect(jsonPath("$.data.referenceHeightM").value(3.0))
                .andExpect(jsonPath("$.data.referenceCrownRadiusM").value(1.0))
                .andExpect(jsonPath("$.data.referenceHeightSourceName").value("Ficha botánica"))
                .andExpect(jsonPath("$.data.pruningAssignment").value("STABLE_STAFF"));
    }

    @Test
    void unmeasuredSpecimenOfCriticalSpeciesExposesNoValues() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/" + specimenOf("bougainvillea-glabra")))
                .andExpect(jsonPath("$.data.speciesCritical").value(true))
                .andExpect(jsonPath("$.data.measurementStatus").value("NOT_MEASURED"))
                .andExpect(jsonPath("$.data.referenceHeightM").value(nullValue()))
                .andExpect(jsonPath("$.data.referenceCrownRadiusM").value(nullValue()))
                .andExpect(jsonPath("$.data.pruningAssignment").value("FIELD_VERIFICATION"));
    }

    @Test
    void measuredSpecimenOverFiveMetresGoesToAThirdParty() throws Exception {
        mockMvc.perform(get(BASE + "/specimens/EV-000001"))
                .andExpect(jsonPath("$.data.measurementStatus").value("MEASURED"))
                .andExpect(jsonPath("$.data.measuredAt").value("2026-01-01"))
                .andExpect(jsonPath("$.data.referenceHeightM").value(nullValue()))
                .andExpect(jsonPath("$.data.pruningAssignment").value("THIRD_PARTY"))
                .andExpect(jsonPath("$.data.measuredBeforeLastPruning").value(false));
    }

    @Test
    void registerDefaultsCriticalityFromTheType() throws Exception {
        register(form("Testus arboreus", "TREE"), SUPERVISOR)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.critical").value(true));

        register(withAverages(form("Testus fruticosus", "SHRUB")), SUPERVISOR)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.critical").value(false))
                .andExpect(jsonPath("$.data.referenceHeightM").value(2.5));
    }

    @Test
    void registerRequiresBothAveragesForANonCriticalSpecies() throws Exception {
        register(form("Testus sinemedia", "SHRUB"), COORDINATOR).andExpect(status().isBadRequest());

        var onlyHeight = form("Testus sinecopa", "SHRUB");
        onlyHeight.put("referenceHeightM", 2.5);
        onlyHeight.put("referenceHeightSourceCode", "BOTANICAL_SHEET");
        register(onlyHeight, COORDINATOR).andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM species WHERE scientific_name LIKE 'Testus sine%'", Integer.class))
                .isZero();
    }

    @Test
    void registerRejectsAnAverageWithoutSource() throws Exception {
        var form = withAverages(form("Testus sinefuente", "SHRUB"));
        form.remove("referenceHeightSourceCode");

        register(form, COORDINATOR).andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsAnUnknownSource() throws Exception {
        var form = withAverages(form("Testus fuenteerronea", "SHRUB"));
        form.put("referenceHeightSourceCode", "NOPE");

        register(form, COORDINATOR).andExpect(status().isBadRequest());
    }

    @Test
    void onlyManagersMayRegisterACriticalityDifferentFromTheDefault() throws Exception {
        var tree = withAverages(form("Testus exceptus", "TREE"));
        tree.put("critical", false);
        register(tree, SUPERVISOR).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species WHERE scientific_name = 'Testus exceptus'", Integer.class))
                .isZero();

        register(tree, COORDINATOR)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.critical").value(false));
    }

    @Test
    void editCorrectsDataWithoutChangingTheSlug() throws Exception {
        register(form("Testus editabilis", "TREE"), COORDINATOR).andExpect(status().isCreated());
        var form = form("Testus corregidus", "TREE");
        form.put("commonName", "Nombre corregido");
        form.put("otherNames", List.of("Alias uno"));

        edit("testus-editabilis", form, SUPERVISOR)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("testus-editabilis"))
                .andExpect(jsonPath("$.data.scientificName").value("Testus corregidus"))
                .andExpect(jsonPath("$.data.commonName").value("Nombre corregido"))
                .andExpect(jsonPath("$.data.otherNames[0]").value("Alias uno"));
        verify(audit).record(eq(AuditActionCode.SPECIES_UPDATED), eq("Species"), any(), any());

        form.put("otherNames", List.of("Alias dos"));
        edit("testus-editabilis", form, SUPERVISOR)
                .andExpect(jsonPath("$.data.otherNames.length()").value(1))
                .andExpect(jsonPath("$.data.otherNames[0]").value("Alias dos"));
    }

    @Test
    void editRejectsTheNameOfAnotherActiveSpecies() throws Exception {
        register(form("Testus duplicatus", "TREE"), COORDINATOR).andExpect(status().isCreated());

        edit("testus-duplicatus", form("Roystonea regia", "TREE"), COORDINATOR).andExpect(status().isConflict());
    }

    @Test
    void editOfAnUnknownSpeciesIsNotFound() throws Exception {
        edit("no-existe", form("Testus inexistens", "TREE"), COORDINATOR).andExpect(status().isNotFound());
    }

    @Test
    void editingTheTypeDoesNotChangeCriticality() throws Exception {
        register(withAverages(form("Testus mutabilis", "SHRUB")), COORDINATOR).andExpect(status().isCreated());

        edit("testus-mutabilis", withAverages(form("Testus mutabilis", "TREE")), SUPERVISOR)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vegetationTypeCode").value("TREE"))
                .andExpect(jsonPath("$.data.critical").value(false));
    }

    @Test
    void supervisorCannotChangeCriticalityOnEdit() throws Exception {
        register(form("Testus protectus", "TREE"), COORDINATOR).andExpect(status().isCreated());
        var form = withAverages(form("Testus protectus", "TREE"));
        form.put("critical", false);

        edit("testus-protectus", form, SUPERVISOR).andExpect(status().isForbidden());

        assertThat(isCritical("testus-protectus")).isTrue();
    }

    @Test
    void movingToNonCriticalRequiresTheAverageAndLeavesNothingPartial() throws Exception {
        register(form("Testus parcialis", "TREE"), COORDINATOR).andExpect(status().isCreated());
        var form = form("Testus parcialis", "TREE");
        form.put("commonName", "No debe guardarse");
        form.put("critical", false);

        edit("testus-parcialis", form, COORDINATOR).andExpect(status().isBadRequest());

        assertThat(isCritical("testus-parcialis")).isTrue();
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE slug = 'testus-parcialis'", String.class))
                .isEqualTo("Nombre de prueba");
        verify(audit, never()).record(eq(AuditActionCode.SPECIES_CRITICALITY_CHANGED), any(), any(), any());
    }

    @Test
    void changingCriticalityIsAuditedAndAppliesToSpecimensWithoutRewritingThem() throws Exception {
        String specimen = specimenOf("nerium-oleander");
        String slug = "nerium-oleander";
        mockMvc.perform(get(BASE + "/specimens/" + specimen))
                .andExpect(jsonPath("$.data.measurementStatus").value("NOT_MEASURED"));
        var form = form("Nerium oleander", "SHRUB");
        form.put("commonName", "Adelfa");
        form.put("critical", false);
        form.put("referenceHeightM", 3.0);
        form.put("referenceHeightSourceCode", "BOTANICAL_SHEET");
        form.put("referenceCrownRadiusM", 1.3);
        form.put("referenceCrownRadiusSourceCode", "BOTANICAL_SHEET");

        edit(slug, form, COORDINATOR).andExpect(status().isOk());

        verify(audit).record(eq(AuditActionCode.SPECIES_CRITICALITY_CHANGED), eq("Species"), any(),
                eq(Map.of("from", true, "to", false)));
        mockMvc.perform(get(BASE + "/specimens/" + specimen))
                .andExpect(jsonPath("$.data.measurementStatus").value("REFERENCE"))
                .andExpect(jsonPath("$.data.referenceHeightM").value(3.0))
                .andExpect(jsonPath("$.data.pruningAssignment").value("STABLE_STAFF"));

        form.put("critical", true);
        edit(slug, form, COORDINATOR).andExpect(status().isOk());

        mockMvc.perform(get(BASE + "/specimens/" + specimen))
                .andExpect(jsonPath("$.data.measurementStatus").value("NOT_MEASURED"))
                .andExpect(jsonPath("$.data.referenceHeightM").value(nullValue()));
        mockMvc.perform(get(BASE + "/species/" + slug))
                .andExpect(jsonPath("$.data.referenceHeightM").value(3.0));
    }

    @Test
    void changingAnAverageIsAudited() throws Exception {
        register(withAverages(form("Testus medius", "SHRUB")), COORDINATOR).andExpect(status().isCreated());
        var form = withAverages(form("Testus medius", "SHRUB"));
        form.put("referenceHeightM", 4.0);

        edit("testus-medius", form, SUPERVISOR).andExpect(status().isOk());

        verify(audit).record(eq(AuditActionCode.SPECIES_REFERENCE_CHANGED), eq("Species"), any(), any());
    }

    @Test
    void exportLabelsTheAverageOriginWithoutExportingValues() throws Exception {
        String coffee = specimenOf("coffea-arabica");
        String bougainvillea = specimenOf("bougainvillea-glabra");

        var csv = mockMvc.perform(get(BASE + "/export.csv").with(COORDINATOR))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Promedio de la especie")))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

        var header = List.of(csv.lines().findFirst().orElseThrow().replace("﻿", "").split(";", -1));
        int height = header.indexOf("altura_m");
        var coffeeRow = csv.lines().filter(l -> l.contains(coffee)).findFirst().orElseThrow().split(";", -1);
        var bougainvilleaRow = csv.lines().filter(l -> l.contains(bougainvillea)).findFirst().orElseThrow();
        assertThat(coffeeRow[height]).isEmpty();
        assertThat(coffeeRow[coffeeRow.length - 1]).isEqualTo("Promedio de la especie");
        assertThat(bougainvilleaRow).endsWith("Sin medir");
    }
}
