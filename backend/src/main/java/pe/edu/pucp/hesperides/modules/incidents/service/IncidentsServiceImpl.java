package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.*;
import pe.edu.pucp.hesperides.modules.incidents.repository.*;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.*;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;
import pe.edu.pucp.hesperides.shared.storage.StoredFileNotFoundException;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class IncidentsServiceImpl implements IncidentsService {
    private final IncidentsRepository incidents;
    private final IncidentInterventionsRepository interventions;
    private final IncidentHistoryRepository history;
    private final IncidentPhotosRepository photos;
    private final UsersRepository users;
    private final TeamsRepository teams;
    private final CatalogItemsRepository catalogs;
    private final IncidentFiles files;
    private final ObjectMapper mapper;

    @Override public Page<IncidentResponse> getAll(String email, String search, String status, int page, int size) {
        User actor = actor(email);
        List<Long> teamIds = ledTeams(actor).stream().map(Team::getId).toList();
        Specification<Incident> filter = (root, query, cb) -> cb.isNull(root.get("deletedAt"));
        if (!coordinator(actor)) filter = filter.and((root, query, cb) -> cb.or(
                cb.equal(root.get("reportedBy").get("id"), actor.getId()),
                teamIds.isEmpty() ? cb.disjunction() : root.get("team").get("id").in(teamIds)));
        if (status != null && !status.isBlank()) {
            item("INCIDENT_STATUS", status);
            filter = filter.and((root, query, cb) -> cb.equal(root.get("status").get("code"), status));
        }
        if (search != null && !search.isBlank()) {
            String pattern = LikePattern.contains(search.trim().toLowerCase(Locale.ROOT));
            filter = filter.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("description")), pattern, '\\'),
                    cb.like(cb.lower(root.get("locationReference")), pattern, '\\')));
        }
        return incidents.findAll(filter, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 50),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"))).map(this::response);
    }

    @Override public DetailResponse getById(Long id, String email) {
        User actor = actor(email);
        return detail(visible(id, actor, false), actor);
    }

    @Override public OptionsResponse options(String email) {
        User actor = actor(email);
        return new OptionsResponse(optionsOf("INCIDENT_STATUS"), optionsOf("INCIDENT_TYPE"),
                optionsOf("URGENCY_LEVEL"), optionsOf("INTERVENTION_TYPE"),
                (coordinator(actor) ? teams.findByActiveTrueAndDeletedAtIsNullOrderByNameAsc() : ledTeams(actor))
                        .stream().map(this::teamResponse).toList());
    }

    @Override @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SummaryResponse summary(String email) {
        requireCoordinator(actor(email));
        return new SummaryResponse(incidents.countByStatusCodeAndDeletedAtIsNull("PENDING_APPROVAL"),
                incidents.countByStatusCodeAndDeletedAtIsNull("OPEN"),
                incidents.countByStatusCodeAndDeletedAtIsNull("IN_PROGRESS"),
                incidents.countByStatusCodeAndDeletedAtIsNull("RESOLVED"), interventions.countCompleted());
    }

    @Override @Transactional
    public CreationResult create(CreateIncidentRequest request, UUID reference, String email) {
        // Serialize creation per sender before testing the unique reference, including concurrent retries.
        User actor = users.lockActiveByEmail(email).orElseThrow(() -> new UnauthorizedException("Session expired"));
        requireRole(actor);
        String hash = hash(request);
        var existing = incidents.findByReportedByIdAndClientReferenceAndDeletedAtIsNull(actor.getId(), reference);
        if (existing.isPresent()) {
            sameRequest(existing.get().getRequestHash(), hash);
            return new CreationResult(detail(existing.get(), actor), false);
        }
        coordinates(request.latitude(), request.longitude());
        Incident incident = new Incident();
        incident.setOriginalDescription(request.description().trim());
        incident.setDescription(request.description().trim());
        incident.setLocationReference(clean(request.locationReference()));
        incident.setLatitude(request.latitude()); incident.setLongitude(request.longitude());
        incident.setReportedBy(actor); incident.setClientReference(reference); incident.setRequestHash(hash);
        List<Team> led = ledTeams(actor);
        if (led.size() == 1) incident.setTeam(led.getFirst());
        incident.setStatus(item("INCIDENT_STATUS", "PENDING_APPROVAL"));
        incidents.saveAndFlush(incident);
        recordStatus(incident, actor);
        return new CreationResult(detail(incident, actor), true);
    }

    @Override @Transactional
    public DetailResponse update(Long id, ReviewIncidentRequest request, String email) {
        User actor = actor(email); requireCoordinator(actor);
        Incident incident = visible(id, actor, true);
        if (incident.getVersion() != request.version()) throw new ConflictException("Incident changed; reload before editing");
        if (state(incident, "RESOLVED")) throw new BusinessRuleException("Incident already resolved");
        coordinates(request.latitude(), request.longitude());
        incident.setDescription(request.description().trim());
        incident.setLocationReference(clean(request.locationReference()));
        incident.setLatitude(request.latitude()); incident.setLongitude(request.longitude());
        incident.setIncidentType(item("INCIDENT_TYPE", request.typeCode()));
        incident.setUrgency(item("URGENCY_LEVEL", request.urgencyCode()));
        incident.setTeam(request.teamId() == null ? null : teams.findById(request.teamId())
                .filter(t -> t.isActive() && !t.isDeleted()).orElseThrow(() -> new ValidationException("Invalid team")));
        incidents.saveAndFlush(incident);
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse approve(Long id, long version, String email) {
        User actor = actor(email); requireCoordinator(actor);
        Incident incident = visible(id, actor, true);
        if (incident.getApprovedAt() != null) return detail(incident, actor);
        if (incident.getVersion() != version) throw new ConflictException("Incident changed; reload before editing");
        incident.setApprovedBy(actor); incident.setApprovedAt(Instant.now());
        transition(incident, "OPEN", actor);
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse start(Long id, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor); requireOpen(incident);
        if (state(incident, "OPEN")) transition(incident, "IN_PROGRESS", actor);
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse resolve(Long id, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor);
        if (state(incident, "RESOLVED")) return detail(incident, actor);
        requireOpen(incident);
        List<IncidentIntervention> work = interventions.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id);
        if (work.isEmpty() || work.stream().anyMatch(w -> !w.getStatus().getCode().equals("COMPLETED")))
            throw new BusinessRuleException("Complete the interventions before resolving");
        incident.setResolvedAt(Instant.now());
        transition(incident, "RESOLVED", actor);
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse addIntervention(Long id, CreateInterventionRequest request, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor);
        if (!request.completed()) requireCoordinator(actor);
        String hash = hash(request);
        var existing = interventions.findByIncidentIdAndClientReferenceAndDeletedAtIsNull(id, request.clientReference());
        if (existing.isPresent()) {
            sameRequest(existing.get().getRequestHash(), hash);
            return detail(incident, actor);
        }
        requireOpen(incident);
        IncidentIntervention work = new IncidentIntervention();
        work.setIncident(incident); work.setDescription(request.description().trim());
        work.setType(item("INTERVENTION_TYPE", request.typeCode())); work.setRecordedBy(actor);
        work.setClientReference(request.clientReference()); work.setRequestHash(hash);
        work.setStatus(item("INTERVENTION_STATUS", request.completed() ? "COMPLETED" : "ASSIGNED"));
        if (request.completed()) {
            work.setCompletedAt(Instant.now()); work.setCompletedBy(actor);
            if (state(incident, "OPEN")) transition(incident, "IN_PROGRESS", actor);
        }
        interventions.saveAndFlush(work);
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse completeIntervention(Long id, Long workId, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor);
        IncidentIntervention work = interventions.findByIdAndIncidentIdAndDeletedAtIsNull(workId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        if (work.getCompletedAt() != null) return detail(incident, actor);
        requireOpen(incident);
        work.setStatus(item("INTERVENTION_STATUS", "COMPLETED"));
        work.setCompletedAt(Instant.now()); work.setCompletedBy(actor);
        if (state(incident, "OPEN")) transition(incident, "IN_PROGRESS", actor);
        interventions.saveAndFlush(work);
        return detail(incident, actor);
    }

    @Override @Transactional
    public PhotoResponse addPhoto(Long id, UUID reference, MultipartFile file, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true);
        if (!coordinator(actor) && !incident.getReportedBy().getId().equals(actor.getId())) requireAttendance(incident, actor);
        if (file.getSize() > IncidentFiles.MAX_BYTES) throw new ValidationException("Invalid photo size");
        byte[] bytes;
        try { bytes = file.getBytes(); } catch (IOException ex) { throw new UncheckedIOException(ex); }
        String type = files.contentType(bytes), hash = digest(bytes);
        var existing = photos.findByIncidentIdAndClientReferenceAndDeletedAtIsNull(id, reference);
        if (existing.isPresent()) {
            sameRequest(existing.get().getRequestHash(), hash);
            return photoResponse(existing.get());
        }
        if (photos.countByIncidentIdAndDeletedAtIsNull(id) >= 6) throw new BusinessRuleException("Photo limit reached");
        IncidentPhoto photo = new IncidentPhoto();
        photo.setIncident(incident); photo.setStorageKey(files.write(bytes, type)); photo.setContentType(type);
        photo.setSizeBytes(bytes.length); photo.setUploadedBy(actor); photo.setClientReference(reference); photo.setRequestHash(hash);
        return photoResponse(photos.saveAndFlush(photo));
    }

    @Override public PhotoContentResponse getPhoto(Long id, Long photoId, String email) {
        visible(id, actor(email), false);
        IncidentPhoto photo = photos.findByIdAndIncidentIdAndDeletedAtIsNull(photoId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        try {
            return new PhotoContentResponse(photo.getContentType(), Base64.getEncoder().encodeToString(files.read(photo.getStorageKey())));
        } catch (StoredFileNotFoundException ex) {
            throw new ResourceNotFoundException("Photo not found");
        }
    }

    private User actor(String email) {
        User user = users.findActiveByEmail(email).filter(User::isActive)
                .orElseThrow(() -> new UnauthorizedException("Session expired"));
        requireRole(user); return user;
    }
    private void requireRole(User user) {
        if (!coordinator(user) && !user.getRoleCode().equals("SUPERVISOR")) throw new AccessDeniedException("Incident role required");
    }
    private boolean coordinator(User user) { return user.getRoleCode().equals("COORDINADOR"); }
    private void requireCoordinator(User user) { if (!coordinator(user)) throw new AccessDeniedException("Coordinator required"); }
    private List<Team> ledTeams(User user) { return teams.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNullOrderByNameAsc(user.getId()); }
    private boolean canAttend(Incident incident, User actor) {
        Team team = incident.getTeam();
        return coordinator(actor) || (team != null && team.isActive() && !team.isDeleted()
                && team.getSupervisorUserId().equals(actor.getId()));
    }
    private void requireAttendance(Incident incident, User actor) {
        if (!canAttend(incident, actor)) throw new AccessDeniedException("Assigned team required");
    }
    private Incident visible(Long id, User actor, boolean lock) {
        Incident incident = (lock ? incidents.lockById(id) : incidents.findByIdAndDeletedAtIsNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        if (!canAttend(incident, actor) && !incident.getReportedBy().getId().equals(actor.getId()))
            throw new ResourceNotFoundException("Incident not found");
        return incident;
    }
    private void requireOpen(Incident incident) {
        if (incident.getApprovedAt() == null) throw new BusinessRuleException("Incident approval required");
        if (state(incident, "RESOLVED")) throw new BusinessRuleException("Incident already resolved");
    }
    private boolean state(Incident incident, String code) { return incident.getStatus().getCode().equals(code); }
    private void transition(Incident incident, String code, User actor) {
        incident.setStatus(item("INCIDENT_STATUS", code)); incidents.saveAndFlush(incident); recordStatus(incident, actor);
    }
    private void recordStatus(Incident incident, User actor) {
        IncidentStatusHistory entry = new IncidentStatusHistory();
        entry.setIncident(incident); entry.setStatus(incident.getStatus()); entry.setChangedBy(actor); history.saveAndFlush(entry);
    }
    private CatalogItem item(String type, String code) {
        if (code == null || code.isBlank()) return null;
        return catalogs.findActiveItemByTypeAndCode(type, code).orElseThrow(() -> new ValidationException("Invalid catalog item"));
    }
    private List<OptionResponse> optionsOf(String type) { return catalogs.findActiveByTypeCode(type).stream().map(this::option).toList(); }
    private OptionResponse option(CatalogItem item) { return item == null ? null : new OptionResponse(item.getId(), item.getCode(), item.getLabel()); }
    private PersonResponse person(User user) { return user == null ? null : new PersonResponse(user.getId(), user.getFullName()); }
    private TeamResponse teamResponse(Team team) { return team == null ? null : new TeamResponse(team.getId(), team.getName()); }
    private PhotoResponse photoResponse(IncidentPhoto photo) { return new PhotoResponse(photo.getId(), photo.getContentType(), photo.getSizeBytes(), photo.getCreatedAt()); }
    private IncidentResponse response(Incident i) {
        return new IncidentResponse(i.getId(), i.getOriginalDescription(), i.getDescription(), i.getLocationReference(),
                i.getLatitude(), i.getLongitude(), option(i.getIncidentType()), option(i.getUrgency()), option(i.getStatus()),
                person(i.getReportedBy()), teamResponse(i.getTeam()), person(i.getApprovedBy()), i.getApprovedAt(),
                i.getResolvedAt(), i.getChannel(), i.getCreatedAt(), i.getVersion());
    }
    private DetailResponse detail(Incident incident, User actor) {
        Long id = incident.getId();
        String suggestedCode = IncidentSuggestions.typeCode(incident.getOriginalDescription());
        OptionResponse suggested = suggestedCode == null ? null : catalogs.findActiveItemByTypeAndCode("INCIDENT_TYPE", suggestedCode).map(this::option).orElse(null);
        return new DetailResponse(response(incident),
                interventions.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                    .map(w -> new InterventionResponse(w.getId(), w.getDescription(), option(w.getType()), option(w.getStatus()),
                            person(w.getRecordedBy()), person(w.getCompletedBy()), w.getCompletedAt(), w.getCreatedAt())).toList(),
                history.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                    .map(h -> new HistoryResponse(h.getId(), option(h.getStatus()), person(h.getChangedBy()), h.getCreatedAt())).toList(),
                photos.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream().map(this::photoResponse).toList(), suggested, canAttend(incident, actor));
    }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private void coordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)
                || (latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)))
            throw new ValidationException("Invalid coordinates");
    }
    private String hash(Object request) { return digest(mapper.writeValueAsString(request).getBytes(StandardCharsets.UTF_8)); }
    private String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private void sameRequest(String previous, String current) {
        if (!previous.equals(current)) throw new ConflictException("Request reference already used with different content");
    }
}
