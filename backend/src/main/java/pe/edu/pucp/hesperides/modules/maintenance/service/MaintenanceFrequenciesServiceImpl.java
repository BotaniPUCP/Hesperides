package pe.edu.pucp.hesperides.modules.maintenance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.SeasonalIntervalPayload;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceFrequenciesServiceImpl implements MaintenanceFrequenciesService {

    private static final String RULE_TYPE_CATALOG = "FREQUENCY_RULE_TYPE";

    private final MaintenanceFrequenciesRepository frequenciesRepository;
    private final CatalogItemsRepository catalogItemsRepository;
    private final ComplianceReader complianceReader;

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse> findAll(String regime, Long activityTypeItemId, Boolean active) {
        return frequenciesRepository.searchCurrent(regime, activityTypeItemId, active)
                .stream().map(MaintenanceFrequencyResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceFrequencyResponse findById(Long id) {
        return MaintenanceFrequencyResponse.from(load(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse> findHistory(Long activityTypeItemId, String regime) {
        return frequenciesRepository.findHistory(activityTypeItemId, regime)
                .stream().map(MaintenanceFrequencyResponse::from).toList();
    }

    @Override
    @Transactional
    public MaintenanceFrequencyResponse create(CreateMaintenanceFrequencyRequest r) {
        CatalogItem activity = loadActivity(r.activityTypeItemId());
        CatalogItem ruleType = loadRuleType(r.frequencyRuleTypeCode());

        FrequencyRuleValidator.validate(r.frequencyRuleTypeCode(), r.minDaysInterval(),
                r.maxDaysInterval(), r.annualTargetCount(), r.coverageTargetDays(),
                r.seasonStartMonth(), r.seasonEndMonth(), r.seasons());
        requireNoCurrentDuplicate(activity.getId(), r.regime(), r.scope(), r.zoneId(), null);

        MaintenanceFrequency f = FrequencyFieldMapper.toNewEntity(r, activity, ruleType);
        return MaintenanceFrequencyResponse.from(frequenciesRepository.save(f));
    }

    /**
     * Versiona en vez de sobrescribir: cierra la vigente y crea otra, salvo que
     * la vigente se haya creado hoy (ver {@link FrequencyVersioning}).
     */
    @Override
    @Transactional
    public MaintenanceFrequencyResponse update(Long id, UpdateMaintenanceFrequencyRequest r) {
        MaintenanceFrequency current = load(id);
        if (!current.isCurrent()) {
            throw new BusinessRuleException(
                    "Esa es una versión histórica y no se edita. Modifique la frecuencia vigente.");
        }

        FrequencyFieldMapper.ResolvedFields fields = resolve(r, current);
        List<SeasonalIntervalPayload> seasons = r.seasons() != null
                ? r.seasons()
                : current.getSeasons().stream().map(FrequencyVersioning::toPayload).toList();

        FrequencyRuleValidator.validate(fields.ruleType().getCode(), fields.minDays(),
                fields.maxDays(), fields.annualCount(), fields.coverageDays(),
                fields.windowStart(), fields.windowEnd(), seasons);
        requireNoCurrentDuplicate(current.getActivityTypeItem().getId(), fields.regime(),
                fields.scope(), fields.zoneId(), current.getId());

        MaintenanceFrequency target = current;
        if (FrequencyVersioning.requiresNewVersion(current)) {
            FrequencyVersioning.closeYesterday(current);
            frequenciesRepository.saveAndFlush(current);
            target = FrequencyVersioning.copyForNewVersion(current);
        }

        FrequencyFieldMapper.apply(target, fields);
        if (r.notes() != null) target.setNotes(r.notes());
        if (r.active() != null) target.setActive(r.active());
        if (r.seasons() != null) FrequencyVersioning.replaceSeasons(target, r.seasons());

        return MaintenanceFrequencyResponse.from(frequenciesRepository.save(target));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        MaintenanceFrequency f = frequenciesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia de mantenimiento no encontrada"));
        f.softDelete();
        f.setActive(false);
        // Una frecuencia retirada no sigue rigiendo.
        if (f.getValidTo() == null && !f.getValidFrom().isAfter(LocalDate.now())) {
            f.setValidTo(LocalDate.now());
        }
        frequenciesRepository.save(f);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceResponse> evaluateCompliance(LocalDate from, LocalDate to, Long activityTypeItemId) {
        return complianceReader.evaluate(from, to, activityTypeItemId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse.ActivityTypeSummary> getAvailableActivityTypes() {
        return catalogItemsRepository.findAvailableActivityTypes().stream()
                .map(MaintenanceFrequencyResponse.ActivityTypeSummary::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceFrequencyResponse.FrequencyRuleTypeSummary> getFrequencyRuleTypes() {
        return catalogItemsRepository.findFrequencyRuleTypes().stream()
                .map(MaintenanceFrequencyResponse.FrequencyRuleTypeSummary::from).toList();
    }

    // ── apoyo ───────────────────────────────────────────────────────────────

    /** Mezcla lo que el request pide cambiar con lo que la version vigente ya tiene. */
    private FrequencyFieldMapper.ResolvedFields resolve(UpdateMaintenanceFrequencyRequest r,
                                                        MaintenanceFrequency current) {
        CatalogItem ruleType = r.frequencyRuleTypeCode() != null
                ? loadRuleType(r.frequencyRuleTypeCode())
                : current.getFrequencyRuleTypeItem();

        return new FrequencyFieldMapper.ResolvedFields(
                ruleType,
                pick(r.regime(), current.getRegime()),
                pick(r.scope(), current.getScope()),
                pick(r.zoneId(), current.getZoneId()),
                pick(r.targetDaysInterval(), current.getTargetDaysInterval()),
                pick(r.minDaysInterval(), current.getMinDaysInterval()),
                pick(r.maxDaysInterval(), current.getMaxDaysInterval()),
                pick(r.annualTargetCount(), current.getAnnualTargetCount()),
                pick(r.coverageTargetDays(), current.getCoverageTargetDays()),
                pick(r.estimatedDurationDays(), current.getEstimatedDurationDays()),
                pick(r.seasonStartMonth(), FrequencyFieldMapper.toInt(current.getSeasonStartMonth())),
                pick(r.seasonEndMonth(), FrequencyFieldMapper.toInt(current.getSeasonEndMonth())));
    }

    private MaintenanceFrequency load(Long id) {
        return frequenciesRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Frecuencia de mantenimiento no encontrada"));
    }

    private CatalogItem loadActivity(Long id) {
        CatalogItem activity = catalogItemsRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de actividad no encontrado"));
        if (!activity.isActive() || activity.isDeleted()) {
            throw new BusinessRuleException("El tipo de actividad seleccionado no está activo");
        }
        return activity;
    }

    private CatalogItem loadRuleType(String code) {
        return catalogItemsRepository.findActiveItemByTypeAndCode(RULE_TYPE_CATALOG, code)
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de regla de frecuencia no válido"));
    }

    private void requireNoCurrentDuplicate(Long activityId, String regime, String scope,
                                           Long zoneId, Long excludeId) {
        frequenciesRepository.findDuplicateCurrent(activityId, regime, scope, zoneId, excludeId)
                .ifPresent(f -> {
                    throw new DuplicateResourceException(
                            "Ya existe una frecuencia vigente para esta actividad, modalidad y ámbito");
                });
    }

    private static <T> T pick(T requested, T fallback) {
        return requested != null ? requested : fallback;
    }
}
