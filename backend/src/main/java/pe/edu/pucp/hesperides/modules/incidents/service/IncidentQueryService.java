package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentsRepository;

import java.util.Arrays;
import java.util.List;

/** Lecturas del módulo, siempre recortadas al alcance de quien pregunta (SPEC-201 §3.1). */
@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class IncidentQueryService {
    static final int MAX_PAGE_SIZE = 50;
    private static final int RECENT_MINE = 8;
    private final IncidentsRepository incidents;
    private final IncidentAccess access;
    private final IncidentListFilters filters;
    private final IncidentResponses responses;
    private final IncidentDetails details;
    private final IncidentCatalogs catalogs;

    public Page<IncidentResponse> list(String email, String search, String status, Boolean active, int page, int size) {
        User actor = access.actor(email);
        if (status != null && !status.isBlank()) catalogs.required(IncidentCatalogs.STATUS, status);
        var spec = filters.visibleTo(actor).and(filters.matching(search, status, active));
        var request = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return incidents.findAll(spec, request).map(responses::of);
    }

    /** Solo lo que envió el usuario, aunque vea más por su cuadrilla. */
    public MineResponse mine(String email) {
        User actor = access.actor(email);
        List<Incident> own = incidents.findByReportedByIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(actor.getId());
        long notActive = own.stream().filter(i -> !i.isActive() && !i.isClosed()).count();
        long closed = own.stream().filter(Incident::isClosed).count();
        return new MineResponse(own.size(), notActive, own.size() - notActive - closed, closed,
                own.stream().limit(RECENT_MINE).map(responses::of).toList());
    }

    public DetailResponse get(Long id, String email) {
        User actor = access.actor(email);
        return details.of(access.visible(id, actor, false), actor);
    }

    public OptionsResponse options(String email) {
        User actor = access.actor(email);
        var teams = access.assignableTeams(actor).stream().map(IncidentResponses::team).toList();
        return new OptionsResponse(catalogOptions(IncidentCatalogs.URGENCY), catalogOptions(IncidentCatalogs.CLASS), types(),
                catalogOptions(IncidentCatalogs.STATUS), catalogOptions(IncidentCatalogs.SOURCE),
                Arrays.stream(HeightClass.values()).map(Enum::name).toList(), teams,
                IncidentCaptureService.DEFAULT_REQUESTER);
    }

    private List<OptionResponse> catalogOptions(String type) {
        return catalogs.active(type).stream().map(IncidentCatalogs::option).toList();
    }

    private List<TypeOptionResponse> types() {
        return catalogs.active(IncidentCatalogs.TYPE).stream().map(IncidentQueryService::type).toList();
    }

    private static TypeOptionResponse type(CatalogItem item) {
        String parent = item.getParentItem() == null ? null : item.getParentItem().getCode();
        return new TypeOptionResponse(item.getId(), item.getCode(), item.getLabel(), parent);
    }
}
