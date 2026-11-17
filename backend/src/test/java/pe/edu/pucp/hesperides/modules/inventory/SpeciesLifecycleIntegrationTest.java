package pe.edu.pucp.hesperides.modules.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SPEC-103: permission, lifecycle, history, audit atomicity and concurrent last-specimen transition. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class SpeciesLifecycleIntegrationTest {

    private static final String BASE = "/api/v1/green-inventory";
    private static final String ADMIN_EMAIL = "admin@pucp.edu.pe";
    private static final RequestPostProcessor ADMIN = user(ADMIN_EMAIL).authorities(() -> "ADMIN");
    private static final RequestPostProcessor COORDINATOR = user(ADMIN_EMAIL).authorities(() -> "COORDINADOR");
    private static final RequestPostProcessor SUPERVISOR = user(ADMIN_EMAIL).authorities(() -> "SUPERVISOR");

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
    @Autowired private ObjectMapper objectMapper;
    @MockitoSpyBean private AuditService audit;

    private record SpeciesFixture(long id, String scientificName, String slug) {
    }

    private SpeciesFixture createSpecies() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String scientific = "Testus lifecycle" + suffix;
        String slug = "testus-lifecycle-" + suffix;
        return createSpecies(scientific, slug);
    }

    private SpeciesFixture createSpecies(String scientific, String slug) {
        Long id = jdbc.queryForObject("""
                INSERT INTO species (scientific_name, slug, species_type_item_id, is_active)
                VALUES (?, ?, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                               WHERE ct.code='SPECIES_TYPE' AND ci.code='TREE'), TRUE)
                RETURNING id
                """, Long.class, scientific, slug);
        return new SpeciesFixture(id, scientific, slug);
    }

    private String addSpecimen(long speciesId) {
        return jdbc.queryForObject("""
                INSERT INTO green_elements (element_type_item_id, species_id, location, registered_by_user_id)
                VALUES ((SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                         WHERE ct.code='GREEN_ELEMENT_TYPE' AND ci.code='INDIVIDUAL'), ?,
                        ST_SetSRID(ST_MakePoint(-77.07, -12.07), 4326),
                        (SELECT id FROM users WHERE email = ?))
                RETURNING code
                """, String.class, speciesId, ADMIN_EMAIL);
    }

    private org.springframework.test.web.servlet.ResultActions deactivateSpecies(String slug, RequestPostProcessor actor)
            throws Exception {
        return mockMvc.perform(patch(BASE + "/species/" + slug + "/deactivate").with(actor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Retiro de catálogo\"}"));
    }

    private org.springframework.test.web.servlet.ResultActions deactivateSpecimen(String code, RequestPostProcessor actor)
            throws Exception {
        return mockMvc.perform(patch(BASE + "/specimens/" + code + "/deactivate").with(actor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Retiro en campo\"}"));
    }

    @Test
    void supervisorCannotDeactivateAndManagerCanDeactivateSpecies() throws Exception {
        SpeciesFixture species = createSpecies();
        deactivateSpecies(species.slug(), SUPERVISOR).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id = ?", Boolean.class, species.id())).isTrue();

        deactivateSpecies(species.slug(), COORDINATOR).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id = ?", Boolean.class, species.id())).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM species WHERE id = ?", Boolean.class, species.id())).isTrue();
        var auditRow = jdbc.queryForMap("""
                SELECT action, entity_type, entity_id, user_id, created_at, changes::text AS changes
                  FROM audit_log WHERE action='SPECIES_SOFT_DELETED' AND entity_id=?
                """, species.id());
        assertThat(auditRow.get("action")).isEqualTo("SPECIES_SOFT_DELETED");
        assertThat(auditRow.get("entity_type")).isEqualTo("Species");
        assertThat(auditRow.get("entity_id")).isEqualTo(species.id());
        assertThat(auditRow.get("user_id")).isEqualTo(jdbc.queryForObject(
                "SELECT id FROM users WHERE email=?", Long.class, ADMIN_EMAIL));
        assertThat(auditRow.get("created_at")).isNotNull();
        assertThat(auditRow.get("changes").toString()).contains(species.slug(), "Retiro de catálogo");
        mockMvc.perform(get(BASE + "/species").param("search", species.scientificName()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(0));
    }

    @Test
    void speciesWithActiveSpecimensStaysVisibleAndItsSpecimensRemainActive() throws Exception {
        SpeciesFixture species = createSpecies();
        String code = addSpecimen(species.id());

        deactivateSpecies(species.slug(), ADMIN).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE id = ?", Boolean.class, species.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code = ?", Boolean.class, code)).isTrue();
        mockMvc.perform(get(BASE + "/species/" + species.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.isActive").value(false));
        mockMvc.perform(get(BASE + "/species/assignable").with(SUPERVISOR)
                        .param("search", species.scientificName()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(0));
        mockMvc.perform(get(BASE + "/species").param("search", species.scientificName()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.totalElements").value(1));
        String export = mockMvc.perform(get(BASE + "/species/export.csv").with(ADMIN))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(export).contains(species.scientificName()).doesNotContain("is_active", "deleted_at");

        String formJson = "{\"scientificName\":\"" + species.scientificName()
                + "\",\"lat\":-12.067219,\"lon\":-77.079643}";
        var form = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE,
                formJson.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart(BASE + "/specimens").file(form).with(SUPERVISOR))
                .andExpect(status().isUnprocessableEntity());

        String csv = "codigo;nombre_cientifico;latitud;longitud;altura_m;fecha_medicion;foto\n"
                + ";" + species.scientificName() + ";-12.067219;-77.079643;;;\n";
        var file = new MockMultipartFile("file", "inactiva.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview").file(file).with(ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unknownSpecies[0].reason").value("INACTIVE"))
                .andExpect(jsonPath("$.data.canConfirm").value(false));
        mockMvc.perform(get("/api/v1/imports/specimens/species-options")
                        .param("search", species.scientificName()).with(ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void anInactiveSpeciesThatStillHasAValidSpecimenBlocksASecondCurrentScientificName() throws Exception {
        SpeciesFixture old = createSpecies("Rosa vigente", "rosa-vigente");
        addSpecimen(old.id());
        deactivateSpecies(old.slug(), ADMIN).andExpect(status().isOk());

        String dataJson = "{\"scientificName\":\"" + old.scientificName()
                + "\",\"vegetationTypeCode\":\"TREE\"}";
        var data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE,
                dataJson.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart(BASE + "/species").file(data).with(ADMIN))
                .andExpect(status().isConflict());

        assertThat(jdbc.queryForObject("SELECT id FROM species WHERE slug=?", Long.class, old.slug())).isEqualTo(old.id());
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id=?", Boolean.class, old.id())).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE id=?", Boolean.class, old.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species WHERE scientific_name=? AND deleted_at IS NULL",
                Integer.class, old.scientificName())).isEqualTo(1);
    }

    @Test
    void anInactiveSpeciesWithLivingSpecimensCannotBeEditedThroughTheApi() throws Exception {
        SpeciesFixture species = createSpecies();
        addSpecimen(species.id());
        deactivateSpecies(species.slug(), ADMIN).andExpect(status().isOk());

        String edit = "{\"scientificName\":\"" + species.scientificName()
                + "\",\"commonName\":\"Nombre cambiado\",\"vegetationTypeCode\":\"TREE\"}";
        mockMvc.perform(put(BASE + "/species/" + species.slug()).with(ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(edit))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT common_name FROM species WHERE id=?", String.class, species.id())).isNull();
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id=?", Boolean.class, species.id())).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE id=?", Boolean.class, species.id())).isTrue();
    }

    @Test
    void lastSpecimenDeactivationRecordsBothEventsForOneActorAndPreservesHistory() throws Exception {
        SpeciesFixture species = createSpecies();
        String code = addSpecimen(species.id());
        jdbc.update("UPDATE species SET is_active=FALSE WHERE id=?", species.id());
        jdbc.update("INSERT INTO green_element_assessments (green_element_id, assessed_on) "
                        + "SELECT id, CURRENT_DATE FROM green_elements WHERE code=?", code);
        jdbc.update("INSERT INTO green_element_measurements (green_element_id, measured_at) "
                + "SELECT id, CURRENT_DATE FROM green_elements WHERE code=?", code);

        deactivateSpecimen(code, SUPERVISOR).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code = ?", Boolean.class, code)).isTrue();
        deactivateSpecimen(code, COORDINATOR).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code = ?", Boolean.class, code)).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM green_elements WHERE code = ?", Boolean.class, code)).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_assessments a JOIN green_elements e "
                + "ON e.id=a.green_element_id WHERE e.code=?", Integer.class, code)).isEqualTo(1);
        mockMvc.perform(get(BASE + "/specimens/" + code + "/assessments"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(1)));
        mockMvc.perform(get(BASE + "/specimens/" + code + "/measurements"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(1)));
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM species WHERE id = ?", Boolean.class, species.id())).isTrue();
        var auditRows = jdbc.query("""
                SELECT action, entity_type, entity_id, user_id, created_at, changes::text AS changes FROM audit_log
                 WHERE action IN ('GREEN_ELEMENT_SOFT_DELETED','SPECIES_AUTO_SOFT_DELETED')
                   AND ((action='SPECIES_AUTO_SOFT_DELETED' AND entity_id=?)
                     OR (action='GREEN_ELEMENT_SOFT_DELETED' AND entity_id=(SELECT id FROM green_elements WHERE code=?)))
                  ORDER BY action
                """, (rs, row) -> new Object[] {rs.getString("action"), rs.getString("entity_type"),
                rs.getLong("entity_id"), rs.getLong("user_id"), rs.getTimestamp("created_at"),
                rs.getString("changes")}, species.id(), code);
        assertThat(auditRows).hasSize(2);
        assertThat(auditRows.stream().map(row -> row[0])).containsExactly("GREEN_ELEMENT_SOFT_DELETED", "SPECIES_AUTO_SOFT_DELETED");
        assertThat(auditRows.get(0)[1]).isEqualTo("GreenElement");
        assertThat(auditRows.get(0)[2]).isEqualTo(jdbc.queryForObject("SELECT id FROM green_elements WHERE code=?", Long.class, code));
        assertThat(auditRows.get(1)[1]).isEqualTo("Species");
        assertThat(auditRows.get(1)[2]).isEqualTo(species.id());
        assertThat(auditRows.stream().map(row -> row[3]).distinct()).containsExactly(
                jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, ADMIN_EMAIL));
        assertThat(auditRows).allSatisfy(row -> assertThat(row[4]).isNotNull());
        assertThat(auditRows.get(0)[5].toString()).contains(code, "Retiro en campo");
        assertThat(auditRows.get(1)[5].toString()).contains("NO_ACTIVE_SPECIMENS_REMAIN", code, "specimenId");
    }

    @Test
    void anActiveSpeciesRemainsActiveAfterItsLastSpecimenIsDeactivated() throws Exception {
        SpeciesFixture species = createSpecies();
        String code = addSpecimen(species.id());

        deactivateSpecimen(code, ADMIN).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id=?", Boolean.class, species.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE id=?", Boolean.class, species.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE action='SPECIES_AUTO_SOFT_DELETED' "
                + "AND entity_id=?", Integer.class, species.id())).isZero();
    }

    @Test
    void concurrentLastSpecimenDeactivationsEmitOnlyOneAutomaticSpeciesEvent() throws Exception {
        SpeciesFixture species = createSpecies();
        String first = addSpecimen(species.id());
        String second = addSpecimen(species.id());
        jdbc.update("UPDATE species SET is_active=FALSE WHERE id=?", species.id());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> concurrentDeactivate(first, ready, start));
            var b = pool.submit(() -> concurrentDeactivate(second, ready, start));
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(a.get(30, TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(b.get(30, TimeUnit.SECONDS)).isEqualTo(200);
        }
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM audit_log WHERE action='SPECIES_AUTO_SOFT_DELETED' AND entity_id=?
                """, Integer.class, species.id())).isEqualTo(1);
    }

    private int concurrentDeactivate(String code, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("test start timed out");
        return deactivateSpecimen(code, ADMIN).andReturn().getResponse().getStatus();
    }

    @Test
    void speciesNameCanBeReusedWithNewIdAndReservedSlug() throws Exception {
        SpeciesFixture old = createSpecies("Rosa repetita", "rosa-repetita");
        jdbc.update("INSERT INTO species_common_names (species_id, name) VALUES (?, 'Nombre histórico')", old.id());
        deactivateSpecies(old.slug(), ADMIN).andExpect(status().isOk());

        String dataJson = "{\"scientificName\":\"" + old.scientificName()
                + "\",\"commonName\":\"Ficha nueva\",\"vegetationTypeCode\":\"TREE\"}";
        var data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE,
                dataJson.getBytes(StandardCharsets.UTF_8));
        var response = mockMvc.perform(multipart(BASE + "/species").file(data).with(ADMIN))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        String newSlug = objectMapper.readTree(response).path("data").path("slug").asString();
        Long newId = jdbc.queryForObject("SELECT id FROM species WHERE slug=?", Long.class, newSlug);
        assertThat(newId).isGreaterThan(old.id());
        assertThat(newSlug).isNotEqualTo(old.slug());
        assertThat(jdbc.queryForObject("SELECT scientific_name FROM species WHERE id=?", String.class, old.id()))
                .isEqualTo(old.scientificName());
        assertThat(jdbc.queryForObject("SELECT is_active FROM species WHERE id=?", Boolean.class, old.id())).isFalse();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM species WHERE id=?", Boolean.class, old.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species_common_names WHERE species_id=?", Integer.class, old.id()))
                .isEqualTo(1);
        mockMvc.perform(get(BASE + "/species/" + old.slug())).andExpect(status().isNotFound());
        mockMvc.perform(get(BASE + "/species/" + newSlug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scientificName").value(old.scientificName()));
    }

    @Test
    void retiredSpecimenCodeCannotBeReusedOrChangedAndCsvCannotRestoreIt() throws Exception {
        SpeciesFixture species = createSpecies();
        String retiredCode = addSpecimen(species.id());
        long retiredId = jdbc.queryForObject("SELECT id FROM green_elements WHERE code=?", Long.class, retiredCode);
        deactivateSpecimen(retiredCode, ADMIN).andExpect(status().isOk());

        String csv = "codigo;nombre_cientifico;latitud;longitud;fecha_medicion\n"
                + retiredCode + ";" + species.scientificName() + ";-12.0701;-77.0701;\n";
        mockMvc.perform(multipart("/api/v1/imports/specimens/preview")
                        .file(new MockMultipartFile("file", "retirado.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                        .with(ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.canConfirm").value(false))
                .andExpect(jsonPath("$.data.issues[0].column").value("codigo"));

        assertThatThrownBy(() -> jdbc.update("UPDATE green_elements SET code=? WHERE id=?", "EV-999998", retiredId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO green_elements (code,element_type_item_id,species_id,location,registered_by_user_id)
                VALUES (?,(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                            WHERE ct.code='GREEN_ELEMENT_TYPE' AND ci.code='INDIVIDUAL'),?,
                       ST_SetSRID(ST_MakePoint(-77.071,-12.071),4326),(SELECT id FROM users WHERE email=?))
                """, retiredCode, species.id(), ADMIN_EMAIL))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);

        String newCode = jdbc.queryForObject("""
                INSERT INTO green_elements (element_type_item_id,species_id,location,registered_by_user_id)
                VALUES ((SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                           WHERE ct.code='GREEN_ELEMENT_TYPE' AND ci.code='INDIVIDUAL'),?,
                       ST_SetSRID(ST_MakePoint(-77.072,-12.072),4326),(SELECT id FROM users WHERE email=?))
                RETURNING code
                """, String.class, species.id(), ADMIN_EMAIL);
        assertThat(newCode).isNotEqualTo(retiredCode);
        assertThat(jdbc.queryForObject("SELECT id FROM green_elements WHERE code=?", Long.class, retiredCode))
                .isEqualTo(retiredId);
    }

    @Test
    void databaseBlocksPhysicalDeletesReactivationAndHistoryCascades() throws Exception {
        assertThat(jdbc.queryForObject("""
                SELECT confdeltype FROM pg_constraint WHERE conname='fk_green_element_measurements_element'
                """, String.class)).isEqualTo("r");
        SpeciesFixture species = createSpecies();
        String code = addSpecimen(species.id());
        long specimenId = jdbc.queryForObject("SELECT id FROM green_elements WHERE code=?", Long.class, code);
        long userId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, ADMIN_EMAIL);
        jdbc.update("INSERT INTO green_element_assessments (green_element_id,assessed_on) VALUES (?,CURRENT_DATE)", specimenId);
        jdbc.update("INSERT INTO green_element_measurements (green_element_id,measured_at) VALUES (?,CURRENT_DATE)", specimenId);
        jdbc.update("""
                INSERT INTO green_element_attachments (green_element_id,storage_key,thumbnail_storage_key,content_type,
                  size_bytes,uploaded_by_user_id)
                VALUES (?, 'history/full.jpg', 'history/thumb.jpg', 'image/jpeg', 1, ?)
                """, specimenId, userId);
        jdbc.update("INSERT INTO species_common_names (species_id,name) VALUES (?, 'Nombre histórico')", species.id());
        jdbc.update("""
                INSERT INTO species_photos (species_id,storage_key,thumbnail_storage_key,content_type,size_bytes,sort_order,uploaded_by_user_id)
                VALUES (?, 'species/full.jpg','species/thumb.jpg','image/jpeg',1,1,?)
                """, species.id(), userId);

        deactivateSpecimen(code, ADMIN).andExpect(status().isOk());
        jdbc.update("UPDATE species SET is_active=FALSE WHERE id=?", species.id());

        assertThatThrownBy(() -> jdbc.update("DELETE FROM green_elements WHERE id=?", specimenId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM species WHERE id=?", species.id()))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE green_elements SET is_active=TRUE WHERE id=?", specimenId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE species SET is_active=TRUE WHERE id=?", species.id()))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO green_elements (element_type_item_id,species_id,location,registered_by_user_id,is_active)
                VALUES ((SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                           WHERE ct.code='GREEN_ELEMENT_TYPE' AND ci.code='INDIVIDUAL'),?,
                       ST_SetSRID(ST_MakePoint(-77.073,-12.073),4326),?,FALSE)
                """, species.id(), userId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        String inactiveName = "Inactiveus " + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO species (scientific_name,slug,species_type_item_id,is_active)
                VALUES (?, ?, (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
                                WHERE ct.code='SPECIES_TYPE' AND ci.code='TREE'), FALSE)
                """, inactiveName, inactiveName.toLowerCase().replace(' ', '-')))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_assessments WHERE green_element_id=?", Integer.class, specimenId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_measurements WHERE green_element_id=?", Integer.class, specimenId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM green_element_attachments WHERE green_element_id=?", Integer.class, specimenId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species_common_names WHERE species_id=?", Integer.class, species.id())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM species_photos WHERE species_id=?", Integer.class, species.id())).isEqualTo(1);
    }

    @Test
    void automaticAuditFailureRollsBackSpecimenSpeciesAndBothAuditRows() throws Exception {
        SpeciesFixture species = createSpecies();
        String code = addSpecimen(species.id());
        jdbc.update("UPDATE species SET is_active=FALSE WHERE id=?", species.id());
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(
                eq(AuditActionCode.SPECIES_AUTO_SOFT_DELETED), eq("Species"), eq(species.id()), any());

        deactivateSpecimen(code, ADMIN).andExpect(status().isInternalServerError());

        assertThat(jdbc.queryForObject("SELECT is_active FROM green_elements WHERE code=?", Boolean.class, code)).isTrue();
        assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM species WHERE id=?", Boolean.class, species.id())).isTrue();
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM audit_log WHERE action IN ('GREEN_ELEMENT_SOFT_DELETED','SPECIES_AUTO_SOFT_DELETED')
                  AND ((action='SPECIES_AUTO_SOFT_DELETED' AND entity_id=?)
                    OR (action='GREEN_ELEMENT_SOFT_DELETED' AND entity_id=(SELECT id FROM green_elements WHERE code=?)))
                """, Integer.class, species.id(), code)).isZero();
    }
}
