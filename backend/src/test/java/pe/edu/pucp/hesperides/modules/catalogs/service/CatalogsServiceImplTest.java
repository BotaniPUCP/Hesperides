package pe.edu.pucp.hesperides.modules.catalogs.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CatalogItemResponse;
import pe.edu.pucp.hesperides.modules.catalogs.dto.CreateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.dto.UpdateCatalogItemRequest;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogType;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogTypesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogsServiceImplTest {

    private static final String TYPE = "INTERVENTION_TYPE";

    @Mock
    private CatalogTypesRepository typesRepository;

    @Mock
    private CatalogItemsRepository itemsRepository;

    @InjectMocks
    private CatalogsServiceImpl service;

    private CatalogType interventionType;

    @BeforeEach
    void setUp() {
        interventionType = type(TYPE, false);
    }

    private CatalogType type(String code, boolean system) {
        CatalogType t = new CatalogType();
        t.setCode(code);
        t.setName(code);
        t.setSystem(system);
        return t;
    }

    private CatalogItem item(String code, String label, int sortOrder, boolean active, CatalogType type) {
        CatalogItem i = new CatalogItem();
        i.setCode(code);
        i.setLabel(label);
        i.setSortOrder(sortOrder);
        i.setActive(active);
        i.setCatalogType(type);
        return i;
    }

    // ─── Consumo ────────────────────────────────────────────────────────────

    @Test
    void activeItemsComeBackInSortOrder() {
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findActiveByTypeCode(TYPE)).thenReturn(List.of(
                item("CANTEO", "Canteo", 1, true, interventionType),
                item("DESHIERBO", "Deshierbo", 2, true, interventionType)));

        List<CatalogItemResponse> items = service.activeItems(TYPE);

        assertThat(items).extracting(CatalogItemResponse::code)
                .containsExactly("CANTEO", "DESHIERBO");
    }

    @Test
    void aCatalogPendingFromTheClientComesBackEmptyNotAsAnError() {
        // CA-02: un catálogo sin valores todavía es una lista vacía. Un error
        // dejaría al formulario sin desplegable y parecería un fallo del sistema.
        when(typesRepository.findByCode("ZONE_TYPE")).thenReturn(Optional.of(type("ZONE_TYPE", false)));
        when(itemsRepository.findActiveByTypeCode("ZONE_TYPE")).thenReturn(List.of());

        assertThat(service.activeItems("ZONE_TYPE")).isEmpty();
    }

    @Test
    void anUnknownTypeCodeIs404() {
        // Un typeCode inexistente es error de desarrollo, no un desplegable vacío.
        when(typesRepository.findByCode("NO_EXISTE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.activeItems("NO_EXISTE"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void theHierarchyTravelsAsTheParentCodeNotItsId() {
        // El id numérico no aparece en ninguna API pública: si se resiembran los
        // catálogos los id cambian y el code no.
        CatalogType classType = type("INTERVENTION_CLASS", false);
        CatalogItem poda = item("PODA", "Poda", 4, true, classType);
        CatalogItem podaSanitaria = item("PODA_SANITARIA", "Poda sanitaria", 3, true, interventionType);
        podaSanitaria.setParentItem(poda);

        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findActiveByTypeCode(TYPE)).thenReturn(List.of(podaSanitaria));

        assertThat(service.activeItems(TYPE).getFirst().parentCode()).isEqualTo("PODA");
    }

    @Test
    void metadataTravelsSoTheClientCanFlagProvisionalTypes() {
        CatalogItem provisional = item("MONITOREO_PLAGAS", "Monitoreo de plagas", 1, true, interventionType);
        provisional.setMetadata(Map.of("provisional", true));

        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findActiveByTypeCode(TYPE)).thenReturn(List.of(provisional));

        assertThat(service.activeItems(TYPE).getFirst().metadata())
                .containsEntry("provisional", true);
    }

    // ─── Administración ─────────────────────────────────────────────────────

    @Test
    void theAdminViewAlsoListsInactiveItems() {
        // CA-04: el de consumo los oculta, el de administración los muestra para
        // que un ítem desactivado por error pueda reactivarse.
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findAllByTypeCode(TYPE)).thenReturn(List.of(
                item("CANTEO", "Canteo", 1, true, interventionType),
                item("DECORACION", "Decoración", 9, false, interventionType)));

        assertThat(service.typeDetail(TYPE).items())
                .extracting(CatalogItemResponse::isActive)
                .containsExactly(true, false);
    }

    @Test
    void aNewItemIsCreatedWithinItsType() {
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "NUEVO")).thenReturn(Optional.empty());
        when(itemsRepository.save(any(CatalogItem.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogItemResponse created = service.createItem(TYPE,
                new CreateCatalogItemRequest("NUEVO", "Nuevo tipo", 10, null, null));

        assertThat(created.code()).isEqualTo("NUEVO");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void aDuplicateCodeWithinTheSameTypeIsRejected() {
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "CANTEO"))
                .thenReturn(Optional.of(item("CANTEO", "Canteo", 1, true, interventionType)));

        assertThatThrownBy(() -> service.createItem(TYPE,
                new CreateCatalogItemRequest("CANTEO", "Otro canteo", 11, null, null)))
                .isInstanceOf(DuplicateResourceException.class);

        verify(itemsRepository, never()).save(any());
    }

    @Test
    void anItemAskedForUnderATypeItDoesNotBelongToIs422() {
        // Sin esta comprobación una FK aceptaría un estado de incidencia como si
        // fuera un rol (SPEC-003 §4).
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "ADMIN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deactivateItem(TYPE, "ADMIN"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void theCodeOfAnItemIsNeverEditable() {
        CatalogItem canteo = item("CANTEO", "Canteo", 1, true, interventionType);
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "CANTEO")).thenReturn(Optional.of(canteo));
        when(itemsRepository.save(any(CatalogItem.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogItemResponse updated = service.updateItem(TYPE, "CANTEO",
                new UpdateCatalogItemRequest("Canteo y perfilado", 2, null));

        assertThat(updated.code()).isEqualTo("CANTEO");
        assertThat(updated.label()).isEqualTo("Canteo y perfilado");
    }

    @Test
    void aProtectedItemOfASystemTypeCannotBeDeactivated() {
        // CA-03: 409 y no 403 — el ADMIN tiene el permiso; lo que falla es que el
        // backend depende de ese code para decidir.
        CatalogType roleType = type("ROLE", true);
        CatalogItem admin = item("ADMIN", "Administrador", 1, true, roleType);
        when(typesRepository.findByCode("ROLE")).thenReturn(Optional.of(roleType));
        when(itemsRepository.findByTypeCodeAndCode("ROLE", "ADMIN")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.deactivateItem("ROLE", "ADMIN"))
                .isInstanceOf(BusinessRuleException.class);

        assertThat(admin.isActive()).isTrue();
    }

    @Test
    void anUnprotectedItemOfANonSystemTypeIsDeactivated() {
        CatalogItem decoracion = item("DECORACION", "Decoración", 9, true, interventionType);
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "DECORACION")).thenReturn(Optional.of(decoracion));
        when(itemsRepository.save(any(CatalogItem.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.deactivateItem(TYPE, "DECORACION").isActive()).isFalse();
    }

    @Test
    void deactivatingAnAlreadyInactiveItemIsIdempotent() {
        CatalogItem inactivo = item("DECORACION", "Decoración", 9, false, interventionType);
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "DECORACION")).thenReturn(Optional.of(inactivo));

        assertThat(service.deactivateItem(TYPE, "DECORACION").isActive()).isFalse();
        verify(itemsRepository, never()).save(any());
    }

    @Test
    void aDeactivatedItemCanBeBroughtBack() {
        CatalogItem inactivo = item("RESIEMBRA", "Resiembra", 6, false, interventionType);
        when(typesRepository.findByCode(TYPE)).thenReturn(Optional.of(interventionType));
        when(itemsRepository.findByTypeCodeAndCode(TYPE, "RESIEMBRA")).thenReturn(Optional.of(inactivo));
        when(itemsRepository.save(any(CatalogItem.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.activateItem(TYPE, "RESIEMBRA").isActive()).isTrue();
    }
}
