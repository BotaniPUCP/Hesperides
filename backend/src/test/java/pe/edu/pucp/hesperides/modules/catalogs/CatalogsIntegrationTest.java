package pe.edu.pucp.hesperides.modules.catalogs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recorre los endpoints contra PostgreSQL real, sobre la taxonomía que siembran
 * V009 y V010. El mapeo JSONB de metadata y el LEFT JOIN FETCH de la jerarquía
 * solo se prueban aquí: con mocks ambos pasarían sin tocar la base.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CatalogsIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void anOperatorCanReadTheInterventionTypesTheFormNeeds() throws Exception {
        // 45 confirmados + 7 preliminares: el operario los ve todos porque todos
        // son seleccionables.
        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_TYPE/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data", hasSize(52)));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void everyTypeCarriesTheCodeOfItsClassSoTheFormCanChainBothSelectors() throws Exception {
        // CA-07: elegir PODA deja el selector de tipo con exactamente 4 opciones.
        // El frontend filtra por parentCode, que es lo que este JSON debe traer.
        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_TYPE/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.parentCode == 'PODA')]", hasSize(4)))
                .andExpect(jsonPath("$.data[?(@.parentCode == 'MANTENIMIENTO')]", hasSize(10)))
                .andExpect(jsonPath("$.data[?(@.parentCode == null)]", hasSize(0)));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theProvisionalFlagSurvivesTheJsonbRoundTrip() throws Exception {
        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_TYPE/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.metadata.provisional == true)]", hasSize(7)))
                .andExpect(jsonPath("$.data[?(@.code == 'CANTEO')].metadata.description")
                        .value("Delimitar y perfilar los bordes de jardineras o macizos"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theNineClassesComeBackInTheOrderTheClientUses() throws Exception {
        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_CLASS/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(9)))
                .andExpect(jsonPath("$.data[0].code").value("HABILITACION"))
                .andExpect(jsonPath("$.data[8].code").value("INSPECCION"));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void noItemEverExposesItsNumericId() throws Exception {
        // El id es un detalle de la base: si se resiembran los catálogos cambia.
        mockMvc.perform(get("/api/v1/catalogs/ROLE/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").doesNotExist())
                .andExpect(jsonPath("$.data[0].code").exists());
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void anUnknownCatalogIs404AndNotAnEmptyDropdown() throws Exception {
        mockMvc.perform(get("/api/v1/catalogs/NO_EXISTE/items"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.ok").value(false));
    }

    @Test
    @WithMockUser(authorities = "OPERARIO")
    void theAdministrationEndpointsAreClosedToNonAdmins() throws Exception {
        mockMvc.perform(get("/api/v1/catalogs")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_TYPE")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void anAdminSeesInactiveItemsThatTheConsumptionEndpointHides() throws Exception {
        // CA-04. El USER genérico de V001 quedó desactivado en V003.
        mockMvc.perform(get("/api/v1/catalogs/ROLE/items"))
                .andExpect(jsonPath("$.data[?(@.code == 'USER')]", hasSize(0)));

        mockMvc.perform(get("/api/v1/catalogs/ROLE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[?(@.code == 'USER')]", hasSize(1)))
                .andExpect(jsonPath("$.data.items[?(@.code == 'USER')].isActive").value(false));
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void aProtectedItemCannotBeDeactivated() throws Exception {
        // CA-03: 409, no 403. El ADMIN tiene el permiso; el conflicto es con el
        // código que decide por ese valor.
        mockMvc.perform(patch("/api/v1/catalogs/ROLE/items/ADMIN/deactivate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.ok").value(false));

        mockMvc.perform(get("/api/v1/catalogs/ROLE/items"))
                .andExpect(jsonPath("$.data[?(@.code == 'ADMIN')]", hasSize(1)));
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void anItemIsCreatedDeactivatedAndBroughtBack() throws Exception {
        mockMvc.perform(post("/api/v1/catalogs/INTERVENTION_TYPE/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "PRUEBA_TIPO", "label": "Tipo de prueba",
                                 "sortOrder": 99, "parentCode": "RIEGO"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("PRUEBA_TIPO"))
                .andExpect(jsonPath("$.data.parentCode").value("RIEGO"));

        mockMvc.perform(patch("/api/v1/catalogs/INTERVENTION_TYPE/items/PRUEBA_TIPO/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        mockMvc.perform(get("/api/v1/catalogs/INTERVENTION_TYPE/items"))
                .andExpect(jsonPath("$.data[?(@.code == 'PRUEBA_TIPO')]", hasSize(0)));

        mockMvc.perform(patch("/api/v1/catalogs/INTERVENTION_TYPE/items/PRUEBA_TIPO/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void aDuplicateCodeInTheSameCatalogIs409() throws Exception {
        mockMvc.perform(post("/api/v1/catalogs/INTERVENTION_TYPE/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "CANTEO", "label": "Canteo repetido", "sortOrder": 50}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void aParentFromTheSameCatalogIsRejected() throws Exception {
        // La jerarquía es de dos niveles entre tipos distintos: un padre del mismo
        // catálogo sería un tercer nivel encubierto que la base no puede impedir.
        mockMvc.perform(post("/api/v1/catalogs/INTERVENTION_TYPE/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "SUB_CANTEO", "label": "Subtipo de canteo",
                                 "sortOrder": 51, "parentCode": "CANTEO"}
                                """))
                .andExpect(status().isUnprocessableEntity());
    }
}
