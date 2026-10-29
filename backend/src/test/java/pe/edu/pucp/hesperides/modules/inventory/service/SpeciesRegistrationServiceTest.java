package pe.edu.pucp.hesperides.modules.inventory.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpeciesRegistrationServiceTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private GreenInventoryService inventoryService;
    @Mock
    private InventoryPhotoService photoService;
    @Mock
    private AuditService auditService;

    private SpeciesRegistrationService service;

    @BeforeEach
    void setUp() {
        service = new SpeciesRegistrationService(jdbc, inventoryService, photoService, auditService);
    }

    @Test
    void toSlugTransformsCorrectly() {
        assertThat(SpeciesRegistrationService.toSlug("Ginkgo biloba")).isEqualTo("ginkgo-biloba");
        assertThat(SpeciesRegistrationService.toSlug("Citrus × sinensis")).isEqualTo("citrus-x-sinensis");
        assertThat(SpeciesRegistrationService.toSlug("Ficus benjamina 'Variegata'")).isEqualTo("ficus-benjamina-variegata");
        assertThat(SpeciesRegistrationService.toSlug("Árbol del fuego")).isEqualTo("arbol-del-fuego");
    }

    @Test
    void toSlugThrowsOnBlank() {
        assertThatThrownBy(() -> SpeciesRegistrationService.toSlug(""))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> SpeciesRegistrationService.toSlug("   "))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void registerThrowsWhenScientificNameIsTooShort() {
        SpeciesForm form = new SpeciesForm("A", "Comun", "Familia", "TREE", null, null, null, null);
        assertThatThrownBy(() -> service.register(form, null, "admin@pucp.edu.pe"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("al menos 2 caracteres");
    }

    @Test
    void registerThrowsWhenScientificNameAlreadyExists() {
        SpeciesForm form = new SpeciesForm("Ginkgo biloba", "Comun", "Familia", "TREE", null, null, null, null);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq("Ginkgo biloba")))
                .thenReturn(true);

        assertThatThrownBy(() -> service.register(form, null, "admin@pucp.edu.pe"))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("ya está registrada");
    }

    @Test
    void registerThrowsWhenVegetationTypeIsInvalid() {
        SpeciesForm form = new SpeciesForm("Ginkgo biloba", "Comun", "Familia", "INVALID_TYPE", null, null, null, null);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq("Ginkgo biloba")))
                .thenReturn(false);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq("ginkgo-biloba")))
                .thenReturn(false);
        when(jdbc.query(anyString(), any(RowMapper.class), eq("INVALID_TYPE")))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.register(form, null, "admin@pucp.edu.pe"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Tipo de vegetación no válido");
    }

    @Test
    void registerSuccessfullyCreatesSpecies() {
        SpeciesForm form = new SpeciesForm("Mangus urus", "Mango", "Mangurus", "TREE", "INTRODUCED",
                List.of("Mango", "Naranja"), "Descripcion", "Cuidados");

        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq("Mangus urus")))
                .thenReturn(false);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq("mangus-urus")))
                .thenReturn(false);
        when(jdbc.query(anyString(), any(RowMapper.class), eq("TREE")))
                .thenReturn(List.of(10L));
        when(jdbc.query(anyString(), any(RowMapper.class), eq("INTRODUCED")))
                .thenReturn(List.of(20L));
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(42L);

        SpeciesResponse mockResponse = new SpeciesResponse("mangus-urus", "Mangus urus", "Mango",
                List.of("Mango", "Naranja"), "Mangurus", "TREE", "Árbol", 0, null, null, List.of());
        when(inventoryService.speciesBySlug("mangus-urus")).thenReturn(mockResponse);

        SpeciesResponse created = service.register(form, null, "admin@pucp.edu.pe");

        assertThat(created).isNotNull();
        assertThat(created.slug()).isEqualTo("mangus-urus");
        verify(auditService).record(eq(AuditActionCode.SPECIES_CREATED), eq("Species"), eq(42L), any());
    }
}
