package pe.edu.pucp.hesperides.modules.planning.sets.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetRequest;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Detail;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ElementRef;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Summary;
import pe.edu.pucp.hesperides.modules.planning.sets.entity.GreenAreaSet;
import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetQueries;
import pe.edu.pucp.hesperides.modules.planning.sets.repository.GreenAreaSetsRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Conjuntos de áreas verdes (SPEC-203 §3.1): valida, delega la pertenencia y audita. */
@Service
@RequiredArgsConstructor
public class GreenAreaSetsServiceImpl implements GreenAreaSetsService {

    private static final String ENTITY = "GREEN_AREA_SET";

    private final GreenAreaSetsRepository sets;
    private final GreenAreaSetQueries queries;
    private final UsersRepository users;
    private final AuditService audit;

    private record Validated(String name, String description, List<Long> zoneIds, List<Long> elementIds,
                             List<Long> activityIds) {
    }

    @Override
    @Transactional(readOnly = true)
    public List<Summary> list() {
        Map<Long, Integer> zones = queries.activeZoneCounts();
        Map<Long, Integer> elements = queries.activeElementCounts();
        return sets.findAllActive().stream().map(s -> new Summary(s.getId(), s.getName(), s.getDescription(),
                zones.getOrDefault(s.getId(), 0), elements.getOrDefault(s.getId(), 0),
                queries.activitiesOf(s.getId()), s.getVersion())).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Detail get(long id) {
        return detail(load(id));
    }

    @Override
    @Transactional
    public Detail create(GreenAreaSetRequest request, String email) {
        Validated v = validate(request, null);
        var set = new GreenAreaSet();
        set.setCreatedByUserId(currentUser(email).getId());
        GreenAreaSet saved = persist(set, v);
        audit.record(AuditActionCode.GREEN_AREA_SET_CREATED, ENTITY, saved.getId(), counts(v));
        return detail(saved);
    }

    @Override
    @Transactional
    public Detail update(long id, GreenAreaSetRequest request, String email) {
        GreenAreaSet set = load(id);
        if (!Objects.equals(request.version(), set.getVersion())) {
            throw new ConflictException("Otra persona cambió este conjunto. Recarga para ver su versión.");
        }
        Validated v = validate(request, id);
        set.setVersion(set.getVersion() + 1);
        GreenAreaSet saved = persist(set, v);
        audit.record(AuditActionCode.GREEN_AREA_SET_UPDATED, ENTITY, id, counts(v));
        return detail(saved);
    }

    @Override
    @Transactional
    public void delete(long id) {
        GreenAreaSet set = load(id);
        if (queries.hasCurrentOwnRule(id)) {
            throw new BusinessRuleException("Quita primero la frecuencia propia de este conjunto");
        }
        set.softDelete();
        sets.save(set);
        audit.record(AuditActionCode.GREEN_AREA_SET_DELETED, ENTITY, id, Map.of());
    }

    private Validated validate(GreenAreaSetRequest r, Long excludeId) {
        String name = GreenAreaSetRules.normalizeName(r.name());
        List<Long> zones = GreenAreaSetRules.optionalIds(r.zoneIds());
        List<Long> elements = GreenAreaSetRules.optionalIds(r.elementIds());
        if (zones.isEmpty() && elements.isEmpty()) {
            throw new BusinessRuleException("Elige al menos un jardín o un ejemplar");
        }
        List<Long> activities = GreenAreaSetRules.distinctIds(r.activityTypeItemIds(), "Elige al menos una actividad");
        if (!zones.isEmpty()) {
            GreenAreaSetRules.rejectAny(queries.nonSections(zones), "Solo se pueden agregar secciones: ");
        }
        if (!elements.isEmpty()) {
            GreenAreaSetRules.rejectAny(queries.invalidElements(elements), "Ejemplares no válidos: ");
        }
        GreenAreaSetRules.rejectAny(queries.invalidActivities(activities), "Actividades no válidas: ");
        if (sets.existsActiveNameIgnoringCase(name, excludeId)) {
            throw new BusinessRuleException("Ya existe un conjunto con ese nombre");
        }
        String description = r.description() == null || r.description().isBlank() ? null : r.description().trim();
        return new Validated(name, description, zones, elements, activities);
    }

    private GreenAreaSet persist(GreenAreaSet set, Validated v) {
        set.setName(v.name());
        set.setDescription(v.description());
        GreenAreaSet saved = sets.save(set);
        queries.replaceZones(saved.getId(), v.zoneIds());
        queries.replaceElements(saved.getId(), v.elementIds());
        queries.replaceActivities(saved.getId(), v.activityIds());
        return saved;
    }

    private Detail detail(GreenAreaSet s) {
        return new Detail(s.getId(), s.getName(), s.getDescription(), s.getVersion(), queries.activitiesOf(s.getId()),
                queries.zonesOf(s.getId()), queries.elementsOf(s.getId()),
                GreenAreaSetRules.crossWarnings(queries.overlaps(s.getId())));
    }

    private static Map<String, Object> counts(Validated v) {
        return Map.of("zoneCount", v.zoneIds().size(), "elementCount", v.elementIds().size());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ElementRef> elementOptions() {
        return queries.elementOptions();
    }

    private GreenAreaSet load(long id) {
        return sets.findActiveById(id).orElseThrow(() -> new ResourceNotFoundException("Conjunto no encontrado"));
    }

    private User currentUser(String email) {
        return users.findActiveByEmail(email).filter(User::isActive)
                .orElseThrow(() -> new AccessDeniedException("Sin sesión válida"));
    }
}
