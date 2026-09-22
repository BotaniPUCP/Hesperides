package pe.edu.pucp.hesperides.modules.maintenance.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MaintenanceFrequenciesServiceImplTest {

    @Mock
    private MaintenanceFrequenciesRepository frequenciesRepository;

    @Mock
    private CatalogItemsRepository catalogItemsRepository;

    private MaintenanceFrequenciesServiceImpl service;

    private CatalogItem activityItem;
    private CatalogItem intervalDaysRuleItem;
    private CatalogItem seasonalRuleItem;
    private CatalogItem coverageRuleItem;

    @BeforeEach
    void setUp() throws Exception {
        service = new MaintenanceFrequenciesServiceImpl(frequenciesRepository, catalogItemsRepository);

        activityItem = new CatalogItem();
        setId(activityItem, 10L);
        activityItem.setCode("CORTE_CESPED");
        activityItem.setLabel("Corte de césped");
        activityItem.setActive(true);

        intervalDaysRuleItem = new CatalogItem();
        setId(intervalDaysRuleItem, 101L);
        intervalDaysRuleItem.setCode("INTERVAL_DAYS");
        intervalDaysRuleItem.setLabel("Intervalo por rango de días");
        intervalDaysRuleItem.setActive(true);

        seasonalRuleItem = new CatalogItem();
        setId(seasonalRuleItem, 102L);
        seasonalRuleItem.setCode("SEASONAL_PERIOD");
        seasonalRuleItem.setLabel("Periodicidad estacional");
        seasonalRuleItem.setActive(true);

        coverageRuleItem = new CatalogItem();
        setId(coverageRuleItem, 103L);
        coverageRuleItem.setCode("COVERAGE_CYCLE");
        coverageRuleItem.setLabel("Ciclo rotativo de cobertura");
        coverageRuleItem.setActive(true);
    }

    private void setId(BaseEntity entity, Long id) throws Exception {
        Field idField = BaseEntity.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(entity, id);
    }

    @Test
    void create_validIntervalDays_persistsSuccessfully() throws Exception {
        CreateMaintenanceFrequencyRequest req = new CreateMaintenanceFrequencyRequest(
                10L, "OUTSOURCED", "INTERVAL_DAYS", "CAMPUS_WIDE", null,
                21, 30, 45, null, "Verano vs Invierno", null, 3, "Nota operativa"
        );

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "INTERVAL_DAYS"))
                .thenReturn(Optional.of(intervalDaysRuleItem));
        when(frequenciesRepository.findDuplicateActive(eq(10L), eq("OUTSOURCED"), eq("CAMPUS_WIDE"), any(), any()))
                .thenReturn(Optional.empty());

        when(frequenciesRepository.save(any(MaintenanceFrequency.class))).thenAnswer(invocation -> {
            MaintenanceFrequency f = invocation.getArgument(0);
            setId(f, 1L);
            return f;
        });

        MaintenanceFrequencyResponse res = service.create(req);

        assertThat(res).isNotNull();
        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.minDaysInterval()).isEqualTo(30);
        assertThat(res.maxDaysInterval()).isEqualTo(45);
        assertThat(res.estimatedDurationDays()).isEqualTo(3);
        verify(frequenciesRepository).save(any(MaintenanceFrequency.class));
    }

    @Test
    void create_minDaysGreaterThanMaxDays_throwsBusinessRuleException() {
        CreateMaintenanceFrequencyRequest req = new CreateMaintenanceFrequencyRequest(
                10L, "OUTSOURCED", "INTERVAL_DAYS", "CAMPUS_WIDE", null,
                21, 45, 30, null, null, null, null, null
        );

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "INTERVAL_DAYS"))
                .thenReturn(Optional.of(intervalDaysRuleItem));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("El intervalo mínimo no puede superar al intervalo máximo");
    }

    @Test
    void create_duplicateActive_throwsDuplicateResourceException() {
        CreateMaintenanceFrequencyRequest req = new CreateMaintenanceFrequencyRequest(
                10L, "OUTSOURCED", "INTERVAL_DAYS", "CAMPUS_WIDE", null,
                21, 30, 45, null, null, null, null, null
        );

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "INTERVAL_DAYS"))
                .thenReturn(Optional.of(intervalDaysRuleItem));

        MaintenanceFrequency existing = new MaintenanceFrequency();
        when(frequenciesRepository.findDuplicateActive(eq(10L), eq("OUTSOURCED"), eq("CAMPUS_WIDE"), any(), any()))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Ya existe una regla de frecuencia activa");
    }

    @Test
    void create_seasonalPeriod_valid_success() throws Exception {
        CreateMaintenanceFrequencyRequest req = new CreateMaintenanceFrequencyRequest(
                10L, "OUTSOURCED", "SEASONAL_PERIOD", "CAMPUS_WIDE", null,
                null, null, null, 4, "Mínimo 4 al año", null, null, "Fitosanitario"
        );

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "SEASONAL_PERIOD"))
                .thenReturn(Optional.of(seasonalRuleItem));
        when(frequenciesRepository.findDuplicateActive(anyLong(), anyString(), anyString(), any(), any()))
                .thenReturn(Optional.empty());

        when(frequenciesRepository.save(any(MaintenanceFrequency.class))).thenAnswer(inv -> {
            MaintenanceFrequency f = inv.getArgument(0);
            setId(f, 2L);
            return f;
        });

        MaintenanceFrequencyResponse res = service.create(req);
        assertThat(res.annualTargetCount()).isEqualTo(4);
    }

    @Test
    void create_coverageCycle_missingCoverageTargetDays_throwsBusinessRuleException() {
        CreateMaintenanceFrequencyRequest req = new CreateMaintenanceFrequencyRequest(
                10L, "IN_HOUSE", "COVERAGE_CYCLE", "CAMPUS_WIDE", null,
                null, null, null, null, null, null, null, "Riego"
        );

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "COVERAGE_CYCLE"))
                .thenReturn(Optional.of(coverageRuleItem));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("especificar los días objetivo de cobertura");
    }

    @Test
    void delete_softDeletesEntity() throws Exception {
        MaintenanceFrequency entity = new MaintenanceFrequency();
        setId(entity, 5L);
        entity.setActive(true);

        when(frequenciesRepository.findById(5L)).thenReturn(Optional.of(entity));

        service.delete(5L);

        assertThat(entity.isActive()).isFalse();
        assertThat(entity.isDeleted()).isTrue();
        verify(frequenciesRepository).save(entity);
    }
}
