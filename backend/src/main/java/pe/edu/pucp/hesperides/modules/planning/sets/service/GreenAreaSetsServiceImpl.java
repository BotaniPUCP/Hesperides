package pe.edu.pucp.hesperides.modules.planning.sets.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetRequest;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Detail;
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

    private record Validated(String name, String description, List<Long> zoneIds, List<Long> activityIds) {
    }

    @Override
    @Transactional(readOnly = true)
    public List<Summary> list() {
        Map<Long, Integer> counts = queries.activeZoneCounts();
        return sets.findAllActive().stream().map(s -> new Summary(s.getId(), s.getName(), s.getDescription(),
                counts.getOrDefault(s.getId(), 0), queries.activitiesOf(s.getId()), s.getVersion())).toList();
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
        audit.record(AuditActionCode.GREEN_AREA_SET_CREATED, ENTITY, saved.getId(), Map.of("zoneCount", v.zoneIds().size()));
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
        audit.record(AuditActionCode.GREEN_AREA_SET_UPDATED, ENTITY, id, Map.of("zoneCount", v.zoneIds().size()));
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
        List<Long> zones = GreenAreaSetRules.distinctIds(r.zoneIds(), "Elige al menos un jardín");
        List<Long> activities = GreenAreaSetRules.distinctIds(r.activityTypeItemIds(), "Elige al menos una actividad");
        GreenAreaSetRules.rejectAny(queries.nonSections(zones), "Solo se pueden agregar secciones: ");
        GreenAreaSetRules.rejectAny(queries.invalidActivities(activities), "Actividades no válidas: ");
        if (sets.existsActiveNameIgnoringCase(name, excludeId)) {
            throw new BusinessRuleException("Ya existe un conjunto con ese nombre");
        }
        String description = r.description() == null || r.description().isBlank() ? null : r.description().trim();
        return new Validated(name, description, zones, activities);
    }

    private GreenAreaSet persist(GreenAreaSet set, Validated v) {
        set.setName(v.name());
        set.setDescription(v.description());
        GreenAreaSet saved = sets.save(set);
        queries.replaceZones(saved.getId(), v.zoneIds());
        queries.replaceActivities(saved.getId(), v.activityIds());
        return saved;
    }

    private Detail detail(GreenAreaSet s) {
        return new Detail(s.getId(), s.getName(), s.getDescription(), s.getVersion(), queries.activitiesOf(s.getId()),
                queries.zonesOf(s.getId()), GreenAreaSetRules.crossWarnings(queries.overlaps(s.getId())));
    }

    private GreenAreaSet load(long id) {
        return sets.findActiveById(id).orElseThrow(() -> new ResourceNotFoundException("Conjunto no encontrado"));
    }

    private User currentUser(String email) {
        return users.findActiveByEmail(email).filter(User::isActive)
                .orElseThrow(() -> new AccessDeniedException("Sin sesión válida"));
    }
}
