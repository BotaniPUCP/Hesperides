package pe.edu.pucp.hesperides.modules.maintenance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceFrequenciesServiceImpl implements MaintenanceFrequenciesService {

    private final MaintenanceFrequenciesRepository frequenciesRepository;
    private final CatalogItemsRepository catalogItemsRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse> findAll(String regime, Long activityTypeItemId, Boolean active) {
        return frequenciesRepository.searchFrequencies(regime, activityTypeItemId, active)
                .stream()
                .map(MaintenanceFrequencyResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceFrequencyResponse findById(Long id) {
        MaintenanceFrequency entity = frequenciesRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia de mantenimiento no encontrada"));
        return MaintenanceFrequencyResponse.from(entity);
    }

    @Override
    @Transactional
    public MaintenanceFrequencyResponse create(CreateMaintenanceFrequencyRequest request) {
        CatalogItem activityItem = catalogItemsRepository.findById(request.activityTypeItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de actividad no encontrado"));

        if (!activityItem.isActive() || activityItem.isDeleted()) {
            throw new BusinessRuleException("El tipo de actividad seleccionado no está activo");
        }

        CatalogItem ruleTypeItem = catalogItemsRepository.findActiveItemByTypeAndCode(
                        "FREQUENCY_RULE_TYPE", request.frequencyRuleTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de regla de frecuencia no válido"));

        validateRuleConsistency(request.frequencyRuleTypeCode(), request.minDaysInterval(),
                request.maxDaysInterval(), request.annualTargetCount(), request.coverageTargetDays());

        frequenciesRepository.findDuplicateActive(
                activityItem.getId(),
                request.regime(),
                request.scope(),
                request.zoneId(),
                null
        ).ifPresent(f -> {
            throw new DuplicateResourceException("Ya existe una regla de frecuencia activa para esta actividad, régimen y ámbito");
        });

        MaintenanceFrequency frequency = new MaintenanceFrequency();
        frequency.setActivityTypeItem(activityItem);
        frequency.setRegime(request.regime());
        frequency.setFrequencyRuleTypeItem(ruleTypeItem);
        frequency.setScope(request.scope());
        frequency.setZoneId(request.zoneId());
        frequency.setTargetDaysInterval(request.targetDaysInterval());
        frequency.setMinDaysInterval(request.minDaysInterval());
        frequency.setMaxDaysInterval(request.maxDaysInterval());
        frequency.setAnnualTargetCount(request.annualTargetCount());
        frequency.setSeasonModifier(request.seasonModifier());
        frequency.setCoverageTargetDays(request.coverageTargetDays());
        frequency.setEstimatedDurationDays(request.estimatedDurationDays());
        frequency.setNotes(request.notes());
        frequency.setActive(true);

        MaintenanceFrequency saved = frequenciesRepository.save(frequency);
        return MaintenanceFrequencyResponse.from(saved);
    }

    @Override
    @Transactional
    public MaintenanceFrequencyResponse update(Long id, UpdateMaintenanceFrequencyRequest request) {
        MaintenanceFrequency frequency = frequenciesRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia de mantenimiento no encontrada"));

        String ruleTypeCode = request.frequencyRuleTypeCode() != null
                ? request.frequencyRuleTypeCode()
                : frequency.getFrequencyRuleTypeItem().getCode();

        if (request.frequencyRuleTypeCode() != null) {
            CatalogItem ruleTypeItem = catalogItemsRepository.findActiveItemByTypeAndCode(
                            "FREQUENCY_RULE_TYPE", request.frequencyRuleTypeCode())
                    .orElseThrow(() -> new ResourceNotFoundException("Tipo de regla de frecuencia no válido"));
            frequency.setFrequencyRuleTypeItem(ruleTypeItem);
        }

        String regime = request.regime() != null ? request.regime() : frequency.getRegime();
        String scope = request.scope() != null ? request.scope() : frequency.getScope();
        Long zoneId = request.zoneId() != null ? request.zoneId() : frequency.getZoneId();

        Integer minDays = request.minDaysInterval() != null ? request.minDaysInterval() : frequency.getMinDaysInterval();
        Integer maxDays = request.maxDaysInterval() != null ? request.maxDaysInterval() : frequency.getMaxDaysInterval();
        Integer annualCount = request.annualTargetCount() != null ? request.annualTargetCount() : frequency.getAnnualTargetCount();
        Integer coverageDays = request.coverageTargetDays() != null ? request.coverageTargetDays() : frequency.getCoverageTargetDays();

        validateRuleConsistency(ruleTypeCode, minDays, maxDays, annualCount, coverageDays);

        frequenciesRepository.findDuplicateActive(
                frequency.getActivityTypeItem().getId(),
                regime,
                scope,
                zoneId,
                frequency.getId()
        ).ifPresent(f -> {
            throw new DuplicateResourceException("Ya existe otra regla de frecuencia activa para esta actividad, régimen y ámbito");
        });

        if (request.regime() != null) frequency.setRegime(request.regime());
        if (request.scope() != null) frequency.setScope(request.scope());
        if (request.zoneId() != null) frequency.setZoneId(request.zoneId());
        if (request.targetDaysInterval() != null) frequency.setTargetDaysInterval(request.targetDaysInterval());
        frequency.setMinDaysInterval(minDays);
        frequency.setMaxDaysInterval(maxDays);
        frequency.setAnnualTargetCount(annualCount);
        if (request.seasonModifier() != null) frequency.setSeasonModifier(request.seasonModifier());
        frequency.setCoverageTargetDays(coverageDays);
        if (request.estimatedDurationDays() != null) frequency.setEstimatedDurationDays(request.estimatedDurationDays());
        if (request.notes() != null) frequency.setNotes(request.notes());
        if (request.active() != null) frequency.setActive(request.active());

        MaintenanceFrequency saved = frequenciesRepository.save(frequency);
        return MaintenanceFrequencyResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        MaintenanceFrequency frequency = frequenciesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia de mantenimiento no encontrada"));

        frequency.softDelete();
        frequency.setActive(false);
        frequenciesRepository.save(frequency);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse.ActivityTypeSummary> getAvailableActivityTypes() {
        return catalogItemsRepository.findAvailableActivityTypes().stream()
                .map(MaintenanceFrequencyResponse.ActivityTypeSummary::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse.FrequencyRuleTypeSummary> getFrequencyRuleTypes() {
        return catalogItemsRepository.findFrequencyRuleTypes().stream()
                .map(MaintenanceFrequencyResponse.FrequencyRuleTypeSummary::from)
                .toList();
    }

    private void validateRuleConsistency(String ruleTypeCode, Integer minDays, Integer maxDays,
                                         Integer annualCount, Integer coverageDays) {
        if ("INTERVAL_DAYS".equals(ruleTypeCode)) {
            if (minDays == null || maxDays == null) {
                throw new BusinessRuleException("Las reglas de intervalo por días requieren definir intervalo mínimo y máximo");
            }
            if (minDays > maxDays) {
                throw new BusinessRuleException("El intervalo mínimo no puede superar al intervalo máximo");
            }
        } else if ("SEASONAL_PERIOD".equals(ruleTypeCode) || "ANNUAL_WINDOW".equals(ruleTypeCode)) {
            if (annualCount == null || annualCount <= 0) {
                throw new BusinessRuleException("Las reglas estacionales o anuales requieren una cuota anual mínima mayor a cero");
            }
        } else if ("COVERAGE_CYCLE".equals(ruleTypeCode)) {
            if (coverageDays == null || coverageDays <= 0) {
                throw new BusinessRuleException("Las reglas por ciclo de cobertura requieren especificar los días objetivo de cobertura");
            }
        }
    }
}
