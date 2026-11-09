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
    private final IncidentMatrix matrix;
    private final IncidentBusinessCalendar calendar;
    private final IncidentUpdatesRepository updates;
    private final IncidentInterventionLinksRepository links;
    private final IncidentWorkLinks workLinks;
    private final pe.edu.pucp.hesperides.modules.interventions.repository.InterventionsRepository realInterventions;
    private final pe.edu.pucp.hesperides.modules.interventions.repository.InterventionQueriesRepository workQueries;
    private final pe.edu.pucp.hesperides.modules.interventions.repository.InterventionEventsRepository workEvents;
    private final jakarta.validation.Validator validator;

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
                    cb.like(cb.lower(root.get("locationReference")), pattern, '\\'),
                    cb.equal(root.get("officialNumber"), officialNumber(search))));
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
                        .stream().map(this::teamResponse).toList(), matrix.options(coordinator(actor)),optionsOf("INTERVENTION_STATUS"));
    }

    @Override @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SummaryResponse summary(String email) {
        requireCoordinator(actor(email));
        return new SummaryResponse(incidents.countByStatusCodeAndDeletedAtIsNull("PENDING_APPROVAL"),
                incidents.countByStatusCodeAndDeletedAtIsNull("OPEN"),
                incidents.countByStatusCodeAndDeletedAtIsNull("IN_PROGRESS"),
                incidents.countByStatusCodeAndDeletedAtIsNull("RESOLVED"), workLinks.countWork(false,false),
                matrix.summary(incidents.findAll((root, query, cb) -> cb.isNull(root.get("deletedAt")))),
                incidents.countByStatusCodeAndDeletedAtIsNull("CHANGES_REQUESTED"),
                incidents.countByStatusCodeAndDeletedAtIsNull("RESOLUTION_OBSERVED"), workLinks.countWork(true,false));
    }

    @Override @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExportResponse export(String email) {
        requireCoordinator(actor(email));
        return matrix.export(incidents.findAll((root, query, cb) -> cb.and(cb.isNull(root.get("deletedAt")),
                cb.isNotNull(root.get("approvedAt"))), Sort.by("createdAt", "id")));
    }

    @Override @Transactional
    public DetailResponse addComment(Long id, CommentRequest request, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true);
        var existing = updates.findByIncidentIdAndClientReferenceAndDeletedAtIsNull(id, request.clientReference());
        String hash = hash(request);
        if (existing.isPresent()) {
            if (!existing.get().getAuthor().getId().equals(actor.getId())) throw new ConflictException("Request reference already used with different content");
            sameRequest(existing.get().getRequestHash(), hash);
        } else recordUpdate(incident, actor, "COMMENT", request.body().trim(), request.clientReference(), hash);
        return detail(incident, actor);
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
        matrix.initialize(incident);
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
        String before = mapper.writeValueAsString(response(incident));
        coordinates(request.latitude(), request.longitude());
        incident.setDescription(request.description().trim());
        incident.setLocationReference(clean(request.locationReference()));
        incident.setLatitude(request.latitude()); incident.setLongitude(request.longitude());
        incident.setIncidentType(item("INCIDENT_TYPE", request.typeCode()));
        incident.setUrgency(item("URGENCY_LEVEL", request.urgencyCode()));
        incident.setTeam(request.teamId() == null ? null : teams.findById(request.teamId())
                .filter(t -> t.isActive() && !t.isDeleted()).orElseThrow(() -> new ValidationException("Invalid team")));
        matrix.apply(incident, request.matrix());
        // Child-only assessment edits must also invalidate the common review version.
        incident.setReviewedAt(Instant.now());
        incidents.saveAndFlush(incident);
        String after = mapper.writeValueAsString(response(incident));
        recordUpdate(incident, actor, "REVIEW", mapper.writeValueAsString(Map.of("before", mapper.readTree(before),
                "after", mapper.readTree(after))), UUID.randomUUID(), digest(after.getBytes(StandardCharsets.UTF_8)));
        return detail(incident, actor);
    }

    @Override @Transactional
    public DetailResponse approve(Long id, long version, String email) {
        User actor = actor(email); requireCoordinator(actor);
        Incident incident = visible(id, actor, true);
        if (incident.getApprovedAt() != null) return detail(incident, actor);
        if (!state(incident,"PENDING_APPROVAL")) throw new BusinessRuleException("Resubmit the report before registration");
        if (incident.getVersion() != version) throw new ConflictException("Incident changed; reload before editing");
        incident.setApprovedBy(actor); incident.setApprovedAt(Instant.now());
        matrix.number(incident);
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
    public DetailResponse requestCorrection(Long id, ReasonRequest request, String email) {
        validateRequest(request);
        User actor=actor(email); requireCoordinator(actor);
        Incident incident=visible(id,actor,true);
        if (incident.getApprovedAt()!=null) throw new BusinessRuleException("Official registration cannot be returned for initial correction");
        String reason=request.reason().trim();
        if (state(incident,"CHANGES_REQUESTED") && reason.equals(incident.getCorrectionReason())) return detail(incident,actor);
        version(incident,request.version());
        incident.setCorrectionReason(reason);
        transition(incident,"CHANGES_REQUESTED",actor);
        recordUpdate(incident,actor,"REPORT_RETURNED",reason,UUID.randomUUID(),hash(request));
        return detail(incident,actor);
    }

    @Override @Transactional
    public DetailResponse resubmit(Long id, CorrectionRequest request, String email) {
        validateRequest(request);
        User actor=actor(email);
        Incident incident=visible(id,actor,true);
        if (!incident.getReportedBy().getId().equals(actor.getId())) throw new AccessDeniedException("Only the reporter can correct this report");
        if (incident.getApprovedAt()!=null) throw new BusinessRuleException("Official registration cannot be edited by the reporter");
        var report=request.report();
        if (state(incident,"PENDING_APPROVAL") && incident.getCorrectionReason()!=null
                && incident.getDescription().equals(report.description().trim())
                && Objects.equals(incident.getLocationReference(),clean(report.locationReference()))
                && Objects.equals(incident.getLatitude(),report.latitude()) && Objects.equals(incident.getLongitude(),report.longitude())) return detail(incident,actor);
        version(incident,request.version());
        if (!state(incident,"CHANGES_REQUESTED")) throw new BusinessRuleException("The report has not been returned for correction");
        coordinates(report.latitude(),report.longitude());
        String before=mapper.writeValueAsString(response(incident));
        incident.setDescription(report.description().trim()); incident.setLocationReference(clean(report.locationReference()));
        incident.setLatitude(report.latitude()); incident.setLongitude(report.longitude());
        transition(incident,"PENDING_APPROVAL",actor);
        recordUpdate(incident,actor,"REPORT_RESUBMITTED",mapper.writeValueAsString(Map.of("before",mapper.readTree(before),
                "after",mapper.valueToTree(response(incident)))),UUID.randomUUID(),hash(request));
        return detail(incident,actor);
    }

    @Override @Transactional
    public DetailResponse observeResolution(Long id, ReasonRequest request, String email) {
        validateRequest(request);
        User actor=actor(email); requireCoordinator(actor);
        Incident incident=visible(id,actor,true);
        if (incident.getApprovedAt()==null) throw new BusinessRuleException("Incident approval required");
        String reason=request.reason().trim();
        if (state(incident,"RESOLUTION_OBSERVED") && reason.equals(incident.getResolutionObservation())) return detail(incident,actor);
        version(incident,request.version());
        String previous=incident.getResolvedAt()==null ? "" : "\nCierre anterior: " + Objects.toString(incident.getResolutionSummary(),"Sin resumen histórico")
                + "\nFecha: " + incident.getResolvedAt() + "\nValidó: " + (incident.getResolvedBy()==null ? "No registrado" : incident.getResolvedBy().getFullName())
                + "\nDías hábiles: " + matrix.duration(incident);
        incident.setResolutionObservation(reason); incident.setResolvedAt(null); incident.setResolvedBy(null);
        incident.setResolutionSummary(null); incident.setClosureBusinessDays(null); incident.setReviewedAt(Instant.now());
        transition(incident,"RESOLUTION_OBSERVED",actor);
        recordUpdate(incident,actor,"RESOLUTION_OBSERVED",reason+previous,UUID.randomUUID(),hash(request));
        return detail(incident,actor);
    }

    @Override @Transactional
    public DetailResponse resolve(Long id, ResolutionRequest request, String email) {
        validateRequest(request);
        User actor = actor(email);
        requireCoordinator(actor);
        Incident incident = visible(id, actor, true);
        String summary=request.resolutionSummary().trim();
        if (state(incident, "RESOLVED")) {
            if (!summary.equals(incident.getResolutionSummary())) throw new ConflictException("Resolution already recorded with another summary");
            return detail(incident, actor);
        }
        version(incident,request.version());
        requireOpen(incident);
        workLinks.lockRequired(id);
        if (!workLinks.ready(id)) throw new BusinessRuleException("Validate all required interventions and map legacy work before closing");
        incident.setResolvedAt(Instant.now());
        incident.setResolvedBy(actor); incident.setResolutionSummary(summary);
        incident.setClosureBusinessDays(calendar.count(incident.getCreatedAt(), incident.getResolvedAt()));
        transition(incident, "RESOLVED", actor);
        recordUpdate(incident,actor,"RESOLVED",summary,UUID.randomUUID(),hash(request));
        return detail(incident, actor);
    }

    @Override public Page<LinkedInterventionResponse> interventionOptions(Long id,String search,int page,String email) {
        User actor=actor(email); requireCoordinator(actor);
        requireOpen(visible(id,actor,false));
        return workLinks.candidates(search,page);
    }

    @Override @Transactional
    public DetailResponse linkIntervention(Long id,LinkInterventionRequest request,String email) {
        validateRequest(request);
        User actor=actor(email); requireCoordinator(actor);
        Incident incident=visible(id,actor,true); requireOpen(incident);
        var work=realInterventions.findForUpdate(request.interventionId()).orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        var live=workQueries.detail(work.getId()).orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        if (live.getStatusCode().equals("CANCELLED")) throw new BusinessRuleException("Cancelled interventions cannot be required work");
        var existing=links.findByIncidentIdAndInterventionIdAndDeletedAtIsNull(id,work.getId());
        var legacyIds=request.legacyWorkIds()==null ? List.<Long>of() : request.legacyWorkIds().stream().distinct().sorted().toList();
        var previousWork=legacyIds.stream().map(old -> interventions.findByIdAndIncidentIdAndDeletedAtIsNull(old,id)
                .orElseThrow(() -> new ValidationException("Legacy work does not belong to this incident"))).toList();
        if (existing.isPresent() && existing.get().getPurpose().getCode().equals(request.purposeCode())
                && previousWork.stream().allMatch(w -> Objects.equals(w.getReplacementInterventionId(),work.getId()))) return detail(incident,actor);
        version(incident,request.version());
        if (!work.getVersion().equals(request.interventionVersion())) throw new ConflictException("Intervention changed; reload before linking");
        if (existing.isPresent() && !existing.get().getPurpose().getCode().equals(request.purposeCode())) throw new ConflictException("Intervention is already linked with another purpose");
        if (previousWork.stream().anyMatch(w -> w.getReplacementInterventionId()!=null && !w.getReplacementInterventionId().equals(work.getId())))
            throw new ConflictException("Legacy work is already mapped to another intervention");
        if (existing.isEmpty()) {
            var link=new IncidentInterventionLink(); link.setIncident(incident); link.setIntervention(work); link.setLinkedBy(actor);
            CatalogItem purpose=item("INCIDENT_ACTION_PURPOSE",request.purposeCode());
            if (purpose==null) throw new ValidationException("Invalid catalog item");
            link.setPurpose(purpose); links.saveAndFlush(link);
        }
        previousWork.forEach(w -> w.setReplacementInterventionId(work.getId())); interventions.flush();
        incident.setReviewedAt(Instant.now()); incidents.saveAndFlush(incident);
        work.setVersion(work.getVersion()+1); realInterventions.saveAndFlush(work);
        var event=new pe.edu.pucp.hesperides.modules.interventions.entity.InterventionEvent();
        event.setInterventionId(work.getId()); event.setActorUserId(actor.getId()); event.setActionCode("INCIDENT_LINKED");
        event.setFromStatusItemId(work.getPlanningStatusItemId()); event.setToStatusItemId(work.getPlanningStatusItemId());
        event.setOccurredAt(Instant.now()); event.setDetails(Map.of("incidentId",id,"purposeCode",request.purposeCode(),"legacyWorkIds",legacyIds));
        workEvents.saveAndFlush(event);
        recordUpdate(incident,actor,"INTERVENTION_LINKED",work.getCode()+" · "+request.purposeCode(),UUID.randomUUID(),hash(request));
        return detail(incident,actor);
    }

    @Override @Transactional
    public DetailResponse unlinkIntervention(Long id,Long linkId,ReasonRequest request,String email) {
        validateRequest(request);
        User actor=actor(email); requireCoordinator(actor);
        Incident incident=visible(id,actor,true); requireOpen(incident);
        var link=links.findById(linkId).filter(l -> l.getIncident().getId().equals(id))
                .orElseThrow(() -> new ResourceNotFoundException("Intervention link not found"));
        if (link.isDeleted()) return detail(incident,actor);
        version(incident,request.version());
        var work=realInterventions.findForUpdate(link.getIntervention().getId()).orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        var live=workQueries.detail(work.getId()).orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        if (live.getStartedAt()!=null) throw new BusinessRuleException("Started work cannot be removed from required interventions");
        link.softDelete(); links.saveAndFlush(link);
        interventions.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                .filter(w -> Objects.equals(w.getReplacementInterventionId(),work.getId())).forEach(w -> w.setReplacementInterventionId(null));
        interventions.flush(); incident.setReviewedAt(Instant.now());incidents.saveAndFlush(incident);
        work.setVersion(work.getVersion()+1);realInterventions.saveAndFlush(work);
        var event=new pe.edu.pucp.hesperides.modules.interventions.entity.InterventionEvent();
        event.setInterventionId(work.getId());event.setActorUserId(actor.getId());event.setActionCode("INCIDENT_UNLINKED");
        event.setFromStatusItemId(work.getPlanningStatusItemId());event.setToStatusItemId(work.getPlanningStatusItemId());
        event.setOccurredAt(Instant.now());event.setReason(request.reason().trim());event.setDetails(Map.of("incidentId",id));
        workEvents.saveAndFlush(event);
        recordUpdate(incident,actor,"INTERVENTION_UNLINKED",work.getCode()+" · "+request.reason().trim(),UUID.randomUUID(),hash(request));
        return detail(incident,actor);
    }

    @Override @Transactional
    public DetailResponse addIntervention(Long id, CreateInterventionRequest request, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor);
        throw new BusinessRuleException("Use the intervention module; legacy work is read-only");
    }

    @Override @Transactional
    public DetailResponse completeIntervention(Long id, Long workId, String email) {
        User actor = actor(email);
        Incident incident = visible(id, actor, true); requireAttendance(incident, actor);
        throw new BusinessRuleException("Use the intervention module; legacy work is read-only");
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
        if (!user.isActive() || !user.getRoleItem().isActive() || user.getRoleItem().isDeleted()) throw new UnauthorizedException("Session expired");
        if (!coordinator(user) && !user.getRoleCode().equals("SUPERVISOR")) throw new AccessDeniedException("Incident role required");
    }
    /** Administración tiene en incidencias los mismos permisos que coordinación. */
    private boolean coordinator(User user) { return IncidentRoles.manages(user.getRoleCode()); }
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
    private void recordUpdate(Incident incident, User actor, String kind, String body, UUID reference, String hash) {
        IncidentUpdate update = new IncidentUpdate();
        update.setIncident(incident); update.setAuthor(actor); update.setKind(item("INCIDENT_UPDATE_KIND", kind));
        update.setBody(body); update.setClientReference(reference); update.setRequestHash(hash); updates.saveAndFlush(update);
    }
    private long officialNumber(String search) {
        try { return Long.parseLong(search.trim().replaceFirst("(?i)^OSG-", "")); }
        catch (NumberFormatException ex) { return -1; }
    }
    private void version(Incident incident,long version) {
        if (incident.getVersion()!=version) throw new ConflictException("Incident changed; reload before editing");
    }
    private void validateRequest(Object request) {
        if (request==null || !validator.validate(request).isEmpty()) throw new ValidationException("Invalid incident request");
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
                i.getResolvedAt(), i.getChannel(), i.getCreatedAt(), i.getVersion(),
                matrix.code(i), matrix.response(i), matrix.duration(i),i.getCorrectionReason(),i.getResolutionSummary(),
                person(i.getResolvedBy()),i.getResolutionObservation());
    }
    private DetailResponse detail(Incident incident, User actor) {
        Long id = incident.getId();
        String suggestedCode = IncidentSuggestions.typeCode(incident.getOriginalDescription());
        OptionResponse suggested = suggestedCode == null ? null : catalogs.findActiveItemByTypeAndCode("INCIDENT_TYPE", suggestedCode).map(this::option).orElse(null);
        return new DetailResponse(response(incident),
                interventions.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                    .map(w -> new InterventionResponse(w.getId(), w.getDescription(), option(w.getType()), option(w.getStatus()),
                            person(w.getRecordedBy()), person(w.getCompletedBy()), w.getCompletedAt(), w.getCreatedAt(), option(w.getPurpose()),w.getReplacementInterventionId())).toList(),
                history.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                    .map(h -> new HistoryResponse(h.getId(), option(h.getStatus()), person(h.getChangedBy()), h.getCreatedAt())).toList(),
                photos.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream().map(this::photoResponse).toList(), suggested, canAttend(incident, actor),
                updates.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(id).stream()
                        .map(u -> new UpdateResponse(u.getId(), person(u.getAuthor()), option(u.getKind()), u.getBody(), u.getCreatedAt())).toList(),
                workLinks.visible(id,actor),links.findByIncidentIdAndDeletedAtIsNullOrderByIdAsc(id).size(),
                coordinator(actor) && incident.getApprovedAt()!=null && incident.getResolvedAt()==null && workLinks.ready(id),
                incident.getApprovedAt()==null && state(incident,"CHANGES_REQUESTED") && incident.getReportedBy().getId().equals(actor.getId()));
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
