package pe.edu.pucp.hesperides.modules.interventions.service;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.interventions.dto.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.*;
import pe.edu.pucp.hesperides.modules.interventions.entity.*;
import pe.edu.pucp.hesperides.modules.interventions.repository.*;
import pe.edu.pucp.hesperides.modules.map.service.LocationDescriptionService;
import pe.edu.pucp.hesperides.shared.exception.*;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@lombok.extern.slf4j.Slf4j
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class InterventionsServiceImpl implements InterventionsService {
    private final InterventionsRepository interventions;
    private final InterventionLocationsRepository locations;
    private final InterventionElementsRepository elements;
    private final InterventionEventsRepository events;
    private final InterventionSubmissionsRepository submissions;
    private final InterventionEvidencesRepository evidences;
    private final InterventionReferencesRepository references;
    private final InterventionQueriesRepository queries;
    private final UsersRepository users;
    private final LocationDescriptionService descriptions;
    private final ObjectMapper json;
    private final Validator validator;
    private final pe.edu.pucp.hesperides.shared.storage.FileStorage storage;
    private final InterventionEvidenceFiles evidenceFiles;
    private final InterventionReviewPolicy reviewPolicy;

    private void validate(Object request) {
        if(request==null)throw new ValidationException("Request is required");
        var violations=validator.validate(request);
        if(!violations.isEmpty())throw new ValidationException("Invalid request: "+violations.iterator().next().getPropertyPath());
    }

    private User actor(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated())throw new UnauthorizedException("Authentication required");
        var u=users.findActiveByEmail(auth.getName()).orElseThrow(()->new UnauthorizedException("Account unavailable"));
        if(!u.isActive()||!u.getRoleItem().isActive()||u.getRoleItem().isDeleted())throw new UnauthorizedException("Account unavailable");
        role(u,"ADMIN","COORDINADOR","SUPERVISOR","OPERARIO");return u;
    }
    private void role(User u,String... allowed){
        if(!Arrays.asList(allowed).contains(u.getRoleCode()))throw new AccessDeniedException("Action not allowed for this role");
    }
    private void scope(User u,Long team,Long assignee){
        boolean visible=switch(u.getRoleCode()){
            case "ADMIN","COORDINADOR"->true;
            case "SUPERVISOR"->references.supervises(u.getId(),team);
            case "OPERARIO"->Objects.equals(u.getId(),assignee);
            default->false;
        };
        if(!visible)throw new ResourceNotFoundException("Intervention not found");
    }
    @Override public Page<InterventionSummaryResponse> findAll(Filter f,Pageable p){
        var u=actor();
        validate(f);
        if (f.greenElementCode()!=null && f.greenElementCode().isBlank()) throw new ValidationException("Element code cannot be blank");
        if(f.incidentId()!=null)throw new BusinessRuleException("Incident integration is not available");
        if(f.dateFrom()!=null&&f.dateTo()!=null&&f.dateFrom().isAfter(f.dateTo()))throw new ValidationException("Invalid date range");
        if(p.isUnpaged()||p.getPageSize()>100)throw new ValidationException("Page size must be between 1 and 100");
        return queries.findAll(f,u.getId(),u.getRoleCode(),p);
    }
    @Override public InterventionDetailResponse findById(Long id){
        return detail(id,actor());
    }
    private InterventionDetailResponse detail(Long id,User u){
        var d=queries.detail(id).orElseThrow(()->new ResourceNotFoundException("Intervention not found"));
        scope(u,d.getTeamId(),d.getAssignedToUserId());
        d.setResponsibleSupervisorUserId(references.responsibleSupervisor(d.getTeamId()));
        var photos=evidences.findByInterventionIdAndDeletedAtIsNullOrderById(id);
        boolean executing = Set.of("SUPERVISOR","OPERARIO").contains(u.getRoleCode())
                && references.candidates(d.getTeamId()).stream().anyMatch(c -> Objects.equals(c.get("id"),u.getId()));
        var localRows=new ArrayList<Map<String,Object>>();
        for(var l:locations.findByInterventionIdAndDeletedAtIsNullOrderById(id)){
            var m=locationSnapshot(l);
            m.put("statusCode",references.code(l.getStatusItemId()));m.put("attemptNumber",l.getAttemptNumber());
            m.put("progressQuantity",l.getProgressQuantity());m.put("executedQuantity",l.getExecutedQuantity());
            m.put("executionNotes",l.getExecutionNotes());m.put("startedAt",l.getStartedAt());m.put("completedAt",l.getCompletedAt());
            m.put("executedByUserId",l.getExecutedByUserId());m.put("validatedAt",l.getValidatedAt());
            m.put("validatedByUserId",l.getValidatedByUserId());m.put("rejectionReason",l.getRejectionReason());
            m.put("pendingEvidenceCount",photos.stream().filter(e->e.getInterventionLocationId().equals(l.getId())&&e.getUploadedAt()==null).count());
            var actions = new ArrayList<String>();
            String localStatus = references.code(l.getStatusItemId());
            if (executing && "ASSIGNED".equals(d.getPlanningStatusCode())) {
                if ("ASSIGNED".equals(localStatus)) actions.add("start");
                if ("IN_PROGRESS".equals(localStatus) && (Objects.equals(u.getId(),l.getExecutedByUserId()) || "SUPERVISOR".equals(u.getRoleCode()))) {
                    actions.addAll(List.of("execution","complete","evidence"));
                }
                if ("OBSERVED".equals(localStatus) && "SUPERVISOR".equals(u.getRoleCode())) actions.add("reopen");
            }
            if ("COORDINADOR".equals(u.getRoleCode()) && "COMPLETED".equals(localStatus)) actions.addAll(List.of("validate","observe"));
            m.put("allowedActions", actions);
            localRows.add(m);
        }
        d.setLocations(localRows);
        var photoRows=new ArrayList<Map<String,Object>>();
        for(var e:photos){
            var m=new LinkedHashMap<String,Object>();m.put("id",e.getId());m.put("interventionVersion",d.getVersion());
            m.put("interventionLocationId",e.getInterventionLocationId());m.put("attemptNumber",e.getAttemptNumber());
            m.put("clientReference",e.getClientReference());m.put("momentCode",references.code(e.getMomentItemId()));
            m.put("greenElementId",e.getGreenElementId());m.put("uploadedAt",e.getUploadedAt());m.put("caption",e.getCaption());
            m.put("uploadedByUserId", e.getUploadedByUserId());
            m.put("canUpload", executing && Objects.equals(u.getId(),e.getUploadedByUserId())
                    && localRows.stream().anyMatch(l -> Objects.equals(l.get("id"),e.getInterventionLocationId())
                        && Set.of("IN_PROGRESS","COMPLETED").contains(l.get("statusCode"))));
            m.put("fileUrl",e.getUploadedAt()==null?null:evidenceFileUrl(e));photoRows.add(m);
        }
        d.setEvidences(photoRows);
        var history=new ArrayList<Map<String,Object>>();
        for(var e:events.findByInterventionIdAndDeletedAtIsNullOrderByOccurredAtAscIdAsc(id)){
            var m=new LinkedHashMap<String,Object>();m.put("actionCode",e.getActionCode());m.put("interventionLocationId",e.getInterventionLocationId());
            m.put("attemptNumber",e.getAttemptNumber());m.put("actorUserId",e.getActorUserId());m.put("occurredAt",e.getOccurredAt());
            m.put("fromStatusCode",e.getFromStatusItemId()==null?null:references.code(e.getFromStatusItemId()));
            m.put("toStatusCode",references.code(e.getToStatusItemId()));m.put("reason",e.getReason());history.add(m);
        }
        d.setHistory(history);
        var grouped=new LinkedHashMap<Long,List<Map<String,Object>>>();
        localRows.stream().filter(m->m.get("unitItemId")!=null).forEach(m->grouped.computeIfAbsent((Long)m.get("unitItemId"),k->new ArrayList<>()).add(m));
        var totals=new ArrayList<Map<String,Object>>();
        grouped.forEach((unit,rows)->{
            var m=new LinkedHashMap<String,Object>();m.put("unitItemId",unit);
            for(String field:List.of("requestedQuantity","progressQuantity","executedQuantity")){
                m.put(field,rows.stream().anyMatch(r->r.get(field)==null)?null:rows.stream().map(r->(BigDecimal)r.get(field)).reduce(BigDecimal.ZERO,BigDecimal::add));
            }totals.add(m);
        });
        d.setQuantityTotals(totals);return d;
    }
    private Map<String,Object> locationSnapshot(InterventionLocation l){
        var m=new LinkedHashMap<String,Object>();m.put("id",l.getId());m.put("clientReference",l.getClientReference());
        m.put("zoneId",l.getZoneId());m.put("placeId",l.getPlaceId());m.put("location",point(l.getLocation()));
        m.put("description",l.getDescription());m.put("locationDescription",l.getLocationDescription());m.put("unitItemId",l.getUnitItemId());
        m.put("requestedQuantity",l.getRequestedQuantity());
        m.put("linkedElementCodes",references.linkedElementCodes(l.getId()));
        m.put("elementIds",elements.findByInterventionLocationIdAndDeletedAtIsNull(l.getId()).stream().map(InterventionElement::getGreenElementId).toList());return m;
    }
    private Point point(String wkt){
        if(wkt==null)return null;
        var coordinates=wkt.substring(wkt.indexOf('(')+1,wkt.indexOf(')')).trim().split("\\s+");
        return new Point(Double.valueOf(coordinates[1]),Double.valueOf(coordinates[0]));
    }
    @Override public Map<String,Object> options(){
        var u=actor();
        var rows=new ArrayList<Map<String,Object>>();
        if (!"OPERARIO".equals(u.getRoleCode())) {
            for(var t:references.teams(u.getRoleCode().equals("SUPERVISOR")?u.getId():null)){
                var row = new LinkedHashMap<String,Object>();
                row.put("id", t.get("id")); row.put("name", t.get("name"));
                row.put("responsibleSupervisorUserId", references.responsibleSupervisor((Long)t.get("id")));
                row.put("assignees", references.candidates((Long)t.get("id")));rows.add(row);
            }
        }
        return Map.of("teams",rows,"catalogs",references.catalogOptions(),"places",references.placeOptions(),"zones",references.zoneOptions());
    }
    @Override @Transactional public Creation create(Planning r,UUID key){
        var u=actor();role(u,"ADMIN","COORDINADOR");
        validate(r);
        if(key==null)throw new ValidationException("Idempotency-Key UUID is required");
        if(!references.lockSubmission(u.getId(),key))throw new ConflictException("Submission is in progress");
        String hash=hash(r);
        var prior=submissions.findByActorUserIdAndOperationAndIdempotencyKeyAndDeletedAtIsNull(u.getId(),"CREATE",key);
        if(prior.isPresent()){
            var s=prior.get();
            if(s.getExpiresAt().isAfter(Instant.now())){
                if(!hash.equals(s.getRequestSha256()))throw new ConflictException("Idempotency key has different content");
                return new Creation(detail(s.getInterventionId(),u),true);
            }
            s.softDelete();submissions.saveAndFlush(s);
        }
        var i=new Intervention();i.setCode(references.nextCode());i.setVersion(0L);i.setCreatedByUserId(u.getId());
        i.setPlanningStatusItemId(status("PLANNED"));
        applyHeader(i,r);interventions.saveAndFlush(i);
        applyLocations(i,r.locations(),false);locations.flush();elements.flush();
        event(i,u,"CREATED",null,null,Map.of("planning",snapshot(i)));
        var s=new InterventionSubmission();s.setActorUserId(u.getId());s.setOperation("CREATE");s.setIdempotencyKey(key);
        s.setRequestSha256(hash);s.setInterventionId(i.getId());s.setExpiresAt(Instant.now().plus(24,ChronoUnit.HOURS));
        submissions.saveAndFlush(s);return new Creation(detail(i.getId(),u),false);
    }
    @Override @Transactional public InterventionDetailResponse update(Long id,Planning r){
        validate(r);
        var u=actor();var i=locked(id,u);role(u,"ADMIN","COORDINADOR");version(i,r.version());editable(i);
        var before=snapshot(i);var oldDate=i.getScheduledDate();
        boolean rescheduled=!Objects.equals(oldDate,r.scheduledDate());
        if(rescheduled&&(r.rescheduleReason()==null||r.rescheduleReason().isBlank()))throw new BusinessRuleException("Reschedule reason is required");
        applyHeader(i,r);applyLocations(i,r.locations(),true);i.setVersion(i.getVersion()+1);interventions.saveAndFlush(i);
        locations.flush();elements.flush();
        event(i,u,"UPDATED",i.getPlanningStatusItemId(),null,Map.of("previous",before,"current",snapshot(i)));
        if(rescheduled)event(i,u,"REPROGRAMMED",i.getPlanningStatusItemId(),r.rescheduleReason(),Map.of("previousDate",oldDate.toString(),"newDate",i.getScheduledDate().toString()));
        return detail(id,u);
    }
    @Override @Transactional public InterventionDetailResponse assign(Long id,Assignment r){
        validate(r);
        var u=actor();var i=locked(id,u);role(u,"COORDINADOR","SUPERVISOR");version(i,r.version());editable(i);
        if(u.getRoleCode().equals("SUPERVISOR")&&!references.supervises(u.getId(),r.teamId()))throw new AccessDeniedException("Team is outside your supervision");
        if(references.responsibleSupervisor(r.teamId())==null)throw new BusinessRuleException("Team requires an active responsible supervisor");
        if(references.candidates(r.teamId()).stream().noneMatch(c->Objects.equals(c.get("id"),r.assignedToUserId())))throw new BusinessRuleException("Assignee must be an active executing member or supervisor of the team");
        var before=snapshot(i);Long from=i.getPlanningStatusItemId();
        i.setTeamId(r.teamId());i.setAssignedToUserId(r.assignedToUserId());i.setAssignedByUserId(u.getId());i.setPlanningStatusItemId(status("ASSIGNED"));
        setLocalStatus(i,"ASSIGNED");i.setVersion(i.getVersion()+1);interventions.saveAndFlush(i);locations.flush();
        event(i,u,"ASSIGNED",from,null,Map.of("previous",before,"current",snapshot(i)));return detail(id,u);
    }
    @Override @Transactional public InterventionDetailResponse cancel(Long id,Cancellation r){
        validate(r);
        var u=actor();var i=locked(id,u);role(u,"ADMIN","COORDINADOR");version(i,r.version());editable(i);
        Long from=i.getPlanningStatusItemId();i.setPlanningStatusItemId(status("CANCELLED"));setLocalStatus(i,"CANCELLED");
        i.setVersion(i.getVersion()+1);interventions.saveAndFlush(i);locations.flush();
        event(i,u,"CANCELLED",from,r.reason(),Map.of());return detail(id,u);
    }
    @Override
    @Transactional
    public InterventionDetailResponse start(Long id, Long locationId, Start request) {
        validate(request);
        var user = actor();
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        requireExecutionAccess(user, intervention);
        version(intervention, request.version());
        if (!references.code(intervention.getPlanningStatusItemId()).equals("ASSIGNED")
                || !references.code(location.getStatusItemId()).equals("ASSIGNED")
                || location.getStartedAt() != null || location.getAttemptNumber() != 0) {
            throw new BusinessRuleException("Only an assigned location that has never started can be started");
        }

        Long previousStatus = location.getStatusItemId();
        location.setStatusItemId(status("IN_PROGRESS"));
        location.setStartedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        location.setExecutedByUserId(user.getId());
        location.setAttemptNumber(1);
        intervention.setVersion(intervention.getVersion() + 1);
        locations.saveAndFlush(location);
        interventions.saveAndFlush(intervention);
        event(intervention, location, user, "STARTED", previousStatus, null,
                Map.of("startedAt", location.getStartedAt(), "executedByUserId", user.getId()));
        return detail(id, user);
    }

    @Override
    @Transactional
    public InterventionDetailResponse saveExecution(Long id, Long locationId, Execution request) {
        validate(request);
        var user = actor();
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        requireExecutionAccess(user, intervention);
        version(intervention, request.version());
        if (!references.code(intervention.getPlanningStatusItemId()).equals("ASSIGNED")
                || !references.code(location.getStatusItemId()).equals("IN_PROGRESS")
                || location.getAttemptNumber() < 1 || location.getStartedAt() == null) {
            throw new BusinessRuleException("Progress can only be saved during an active local execution");
        }
        if (!canReport(user, intervention, location)) {
            throw new AccessDeniedException("Only the actual executor of this location can save its progress");
        }
        if (request.progressQuantity() != null && location.getUnitItemId() == null) {
            throw new BusinessRuleException("A quantity requires a local measurement unit");
        }

        var previous = executionSnapshot(location);
        location.setProgressQuantity(request.progressQuantity());
        location.setExecutionNotes(request.executionNotes());
        intervention.setVersion(intervention.getVersion() + 1);
        locations.saveAndFlush(location);
        interventions.saveAndFlush(intervention);
        event(intervention, location, user, "PROGRESS_SAVED", location.getStatusItemId(), null,
                Map.of("previous", previous, "current", executionSnapshot(location)));
        return detail(id, user);
    }

    @Override
    @Transactional
    public InterventionDetailResponse complete(Long id, Long locationId, Completion request) {
        validate(request);
        var user = actor();
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        requireExecutionAccess(user, intervention);
        version(intervention, request.version());
        requireLocalState(intervention, location, "IN_PROGRESS");
        if (!canReport(user, intervention, location)) throw new AccessDeniedException("Only the executor or responsible supervisor can complete this location");
        if (request.executedQuantity() != null && location.getUnitItemId() == null) {
            throw new BusinessRuleException("A quantity requires a local measurement unit");
        }
        if (location.getUnitItemId() != null && request.executedQuantity() == null) {
            throw new BusinessRuleException("Executed quantity is required when the location has a measurement unit");
        }
        reviewPolicy.check(location, false);
        var previous = reviewSnapshot(location);
        Long from = location.getStatusItemId();
        location.setExecutedQuantity(request.executedQuantity());
        location.setExecutionNotes(request.executionNotes());
        location.setCompletedAt(microseconds(Instant.now()));
        location.setStatusItemId(status("COMPLETED"));
        persistReview(intervention, location, user, "COMPLETED", from, null, previous);
        return detail(id, user);
    }

    @Override
    @Transactional
    public InterventionDetailResponse validateLocation(Long id, Long locationId, Review request) {
        validate(request);
        var user = actor();
        role(user, "COORDINADOR");
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        version(intervention, request.version());
        requireLocalState(intervention, location, "COMPLETED");
        if (Objects.equals(user.getId(), location.getExecutedByUserId()) ||
                events.findByInterventionIdAndDeletedAtIsNullOrderByOccurredAtAscIdAsc(id).stream().anyMatch(e ->
                    Objects.equals(e.getInterventionLocationId(), locationId) && Objects.equals(e.getActorUserId(), user.getId())
                    && Set.of("STARTED", "PROGRESS_SAVED", "COMPLETED", "REOPENED", "EVIDENCE_ANNOUNCED", "EVIDENCE_UPLOADED").contains(e.getActionCode()))) {
            throw new AccessDeniedException("A coordinator cannot approve their own execution or reporting");
        }
        reviewPolicy.check(location, true);
        var previous = reviewSnapshot(location);
        Long from = location.getStatusItemId();
        location.setStatusItemId(status("VALIDATED"));
        location.setValidatedAt(microseconds(Instant.now()));
        location.setValidatedByUserId(user.getId());
        persistReview(intervention, location, user, "VALIDATED", from, null, previous);
        return detail(id, user);
    }

    @Override
    @Transactional
    public InterventionDetailResponse observe(Long id, Long locationId, Observation request) {
        validate(request);
        var user = actor();
        role(user, "COORDINADOR");
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        version(intervention, request.version());
        requireLocalState(intervention, location, "COMPLETED");
        var previous = reviewSnapshot(location);
        Long from = location.getStatusItemId();
        location.setStatusItemId(status("OBSERVED"));
        location.setRejectionReason(request.reason());
        persistReview(intervention, location, user, "OBSERVED", from, request.reason(), previous);
        return detail(id, user);
    }

    @Override
    @Transactional
    public InterventionDetailResponse reopen(Long id, Long locationId, Review request) {
        validate(request);
        var user = actor();
        role(user, "SUPERVISOR");
        var intervention = locked(id, user);
        var location = lockedLocation(locationId, intervention);
        requireExecutionAccess(user, intervention);
        version(intervention, request.version());
        requireLocalState(intervention, location, "OBSERVED");
        var previous = reviewSnapshot(location);
        Long from = location.getStatusItemId();
        String reason = location.getRejectionReason();
        location.setAttemptNumber(Math.addExact(location.getAttemptNumber(), 1));
        location.setStatusItemId(status("IN_PROGRESS"));
        location.setStartedAt(microseconds(Instant.now()));
        location.setCompletedAt(null);
        location.setValidatedAt(null);
        location.setValidatedByUserId(null);
        location.setProgressQuantity(null);
        location.setExecutedQuantity(null);
        location.setExecutionNotes(null);
        location.setRejectionReason(null);
        // Correction does not authorize a transfer or rewrite the original executor.
        persistReview(intervention, location, user, "REOPENED", from, reason, previous);
        return detail(id, user);
    }

    private boolean canReport(User user, Intervention intervention, InterventionLocation location) {
        return Objects.equals(user.getId(), location.getExecutedByUserId())
                || ("SUPERVISOR".equals(user.getRoleCode()) && references.supervises(user.getId(), intervention.getTeamId()));
    }

    private void requireLocalState(Intervention intervention, InterventionLocation location, String expected) {
        if (!"ASSIGNED".equals(references.code(intervention.getPlanningStatusItemId()))
                || !expected.equals(references.code(location.getStatusItemId()))) {
            throw new BusinessRuleException("Location must be " + expected + " for this action");
        }
    }

    private Map<String,Object> reviewSnapshot(InterventionLocation location) {
        var snapshot = new LinkedHashMap<String,Object>(executionSnapshot(location));
        snapshot.put("attemptNumber", location.getAttemptNumber());
        snapshot.put("executedByUserId", location.getExecutedByUserId());
        snapshot.put("executedQuantity", location.getExecutedQuantity());
        snapshot.put("startedAt", location.getStartedAt());
        snapshot.put("completedAt", location.getCompletedAt());
        snapshot.put("validatedAt", location.getValidatedAt());
        snapshot.put("validatedByUserId", location.getValidatedByUserId());
        snapshot.put("rejectionReason", location.getRejectionReason());
        return snapshot;
    }

    private void persistReview(Intervention intervention, InterventionLocation location, User user,
            String action, Long from, String reason, Map<String,Object> previous) {
        locations.saveAndFlush(location);
        intervention.setVersion(intervention.getVersion() + 1);
        interventions.saveAndFlush(intervention);
        event(intervention, location, user, action, from, reason,
                Map.of("previous", previous, "current", reviewSnapshot(location)));
    }

    @Override
    @Transactional
    public Announcement announceEvidence(Long id, Evidence request, UUID key) {
        validate(request);
        var user = actor();
        role(user, "SUPERVISOR", "OPERARIO");
        // Authorize with a projection first, without caching a stale managed aggregate.
        // The nonblocking submit lock must precede any wait on the aggregate row.
        var visible = queries.detail(id).orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        scope(user, visible.getTeamId(), visible.getAssignedToUserId());
        if (key == null) throw new ValidationException("Idempotency-Key UUID is required");
        if (!references.lockEvidenceSubmission(user.getId(), key, request.clientReference())) {
            throw new ConflictException("Evidence announcement is in progress");
        }
        var intervention = locked(id, user);
        var location = lockedLocation(request.interventionLocationId(), intervention);
        requireExecutionAccess(user, intervention);
        String requestHash = hash(Map.of("interventionId", id, "request", request));
        var prior = submissions.findByActorUserIdAndOperationAndIdempotencyKeyAndDeletedAtIsNull(user.getId(), "EVIDENCE_ANNOUNCE", key);
        if (prior.isPresent()) {
            var submit = prior.get();
            if (submit.getExpiresAt().isAfter(Instant.now())) {
                if (!requestHash.equals(submit.getRequestSha256())) throw new ConflictException("Idempotency key has different content");
                var evidence = evidence(id, submit.getEvidenceId());
                requireSameEvidence(evidence, intervention, location, user, request);
                return new Announcement(evidenceResponse(evidence, intervention), true);
            }
            submit.softDelete();
            submissions.saveAndFlush(submit);
        }
        // The client reference survives submit expiration and application restarts.
        var permanent = evidences.findByClientReference(request.clientReference());
        if (permanent.isPresent()) {
            requireSameEvidence(permanent.get(), intervention, location, user, request);
            saveEvidenceSubmit(intervention, permanent.get(), user, key, requestHash);
            return new Announcement(evidenceResponse(permanent.get(), intervention), true);
        }
        version(intervention, request.version());
        if (!references.code(intervention.getPlanningStatusItemId()).equals("ASSIGNED")
                || !references.code(location.getStatusItemId()).equals("IN_PROGRESS")
                || location.getAttemptNumber() < 1 || location.getStartedAt() == null) {
            throw new BusinessRuleException("New evidence requires an active local execution");
        }
        if (!canReport(user, intervention, location)) {
            throw new AccessDeniedException("Only the actual local executor can announce evidence");
        }
        if (!Set.of("BEFORE", "AFTER", "UNSPECIFIED").contains(request.momentCode())) {
            throw new BusinessRuleException("Invalid evidence moment");
        }
        Long moment = references.codeId("EVIDENCE_MOMENT", request.momentCode());
        if (moment == null) throw new BusinessRuleException("Evidence moment is unavailable");
        if (request.greenElementId() != null && elements.findByInterventionLocationIdAndDeletedAtIsNull(location.getId()).stream()
                .noneMatch(element -> element.getGreenElementId().equals(request.greenElementId()))) {
            throw new BusinessRuleException("Evidence element must belong to this location");
        }
        var evidence = new InterventionEvidence();
        evidence.setInterventionId(id);
        evidence.setInterventionLocationId(location.getId());
        evidence.setAttemptNumber(location.getAttemptNumber());
        evidence.setClientReference(request.clientReference());
        evidence.setMomentItemId(moment);
        evidence.setGreenElementId(request.greenElementId());
        evidence.setCapturedAt(microseconds(request.capturedAt()));
        evidence.setCapturedLocation(request.capturedLocation() == null ? null :
                "POINT(" + request.capturedLocation().longitude() + " " + request.capturedLocation().latitude() + ")");
        evidence.setCaption(request.caption());
        evidence.setUploadedByUserId(user.getId());
        evidences.saveAndFlush(evidence);
        intervention.setVersion(intervention.getVersion() + 1);
        interventions.saveAndFlush(intervention);
        event(intervention, location, user, "EVIDENCE_ANNOUNCED", location.getStatusItemId(), null,
                Map.of("evidenceId", evidence.getId(), "clientReference", evidence.getClientReference(), "momentCode", request.momentCode()));
        saveEvidenceSubmit(intervention, evidence, user, key, requestHash);
        return new Announcement(evidenceResponse(evidence, intervention), false);
    }

    @Override
    @Transactional
    public InterventionEvidenceResponse uploadEvidence(Long id, Long evidenceId,
            org.springframework.web.multipart.MultipartFile file) {
        var user = actor();
        var intervention = locked(id, user);
        var existing = evidence(id, evidenceId);
        var location = lockedLocation(existing.getInterventionLocationId(), intervention);
        var evidence = evidences.findForUpdate(evidenceId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found"));
        requireExecutionAccess(user, intervention);
        if (!Objects.equals(user.getId(), evidence.getUploadedByUserId())) {
            throw new AccessDeniedException("Only the evidence author can upload its file");
        }
        byte[] bytes = pe.edu.pucp.hesperides.shared.storage.PhotoUploads.required(file);
        String checksum = sha256(bytes);
        // Successful retries are recognized before checking the current local state.
        if (evidence.getUploadedAt() != null) {
            if (!checksum.equals(evidence.getContentSha256())) throw new ConflictException("Evidence bytes cannot be replaced");
            return evidenceResponse(evidence, intervention);
        }
        if (!references.code(intervention.getPlanningStatusItemId()).equals("ASSIGNED")
                || !Set.of("IN_PROGRESS", "COMPLETED").contains(references.code(location.getStatusItemId()))) {
            throw new BusinessRuleException("Pending uploads are allowed only during or after execution, before review");
        }
        var format = evidenceFiles.validate(bytes);
        String filename = file.getOriginalFilename();
        if (filename != null) {
            filename = filename.replace('\\', '/');
            filename = filename.substring(filename.lastIndexOf('/') + 1);
            if (filename.length() > 255 || filename.chars().anyMatch(c -> c < 32 || c == 127)) {
                throw new ValidationException("Invalid photo filename");
            }
        }
        String storageKey = "interventions/" + id + "/locations/" + location.getId() + "/attempts/"
                + evidence.getAttemptNumber() + "/" + evidenceId + "/" + UUID.randomUUID() + "." + format.extension();
        // Register before writing: a failed provider call may already have left partial bytes.
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCompletion(int completion) {
                        if (completion == STATUS_ROLLED_BACK) {
                            try { storage.delete(storageKey); }
                            catch (RuntimeException cleanupFailure) { log.warn("Could not clean an uncommitted intervention photo", cleanupFailure); }
                        } else if (completion == STATUS_UNKNOWN) {
                            log.warn("Unknown photo transaction outcome; object retained for reconciliation: {}", storageKey);
                        }
                    }
                });
        storage.put(storageKey, bytes, format.contentType());
        evidence.setStorageKey(storageKey);
        evidence.setOriginalFilename(filename);
        evidence.setContentType(format.contentType());
        evidence.setSizeBytes((long)bytes.length);
        evidence.setContentSha256(checksum);
        evidence.setUploadedAt(microseconds(Instant.now()));
        evidences.saveAndFlush(evidence);
        intervention.setVersion(intervention.getVersion() + 1);
        interventions.saveAndFlush(intervention);
        event(intervention, location, user, "EVIDENCE_UPLOADED", location.getStatusItemId(), null,
                Map.of("evidenceId", evidenceId, "sizeBytes", bytes.length, "contentType", format.contentType()), evidence.getAttemptNumber());
        return evidenceResponse(evidence, intervention);
    }

    @Override
    public EvidenceFile evidenceFile(Long id, Long evidenceId) {
        var user = actor();
        var intervention = interventions.findById(id).filter(i -> !i.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found"));
        scope(user, intervention.getTeamId(), intervention.getAssignedToUserId());
        var evidence = evidence(id, evidenceId);
        if (locations.findById(evidence.getInterventionLocationId()).filter(l -> !l.isDeleted()).isEmpty()) {
            throw new ResourceNotFoundException("Evidence location not found");
        }
        if (evidence.getUploadedAt() == null) throw new ConflictException("Evidence file is still pending");
        try { return new EvidenceFile(storage.read(evidence.getStorageKey()), evidence.getContentType()); }
        catch (pe.edu.pucp.hesperides.shared.storage.StoredFileNotFoundException missing) {
            throw new ResourceNotFoundException("Evidence file is not available");
        }
    }

    private InterventionEvidence evidence(Long id, Long evidenceId) {
        return evidences.findByIdAndInterventionIdAndDeletedAtIsNull(evidenceId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found in this intervention"));
    }

    private void requireSameEvidence(InterventionEvidence evidence, Intervention intervention,
            InterventionLocation location, User user, Evidence request) {
        boolean matches = !evidence.isDeleted() && Objects.equals(evidence.getInterventionId(), intervention.getId())
                && Objects.equals(evidence.getInterventionLocationId(), location.getId())
                && Objects.equals(evidence.getUploadedByUserId(), user.getId())
                && Objects.equals(evidence.getClientReference(), request.clientReference())
                && Objects.equals(references.code(evidence.getMomentItemId()), request.momentCode())
                && Objects.equals(evidence.getGreenElementId(), request.greenElementId())
                && Objects.equals(evidence.getCapturedAt(), microseconds(request.capturedAt()))
                && Objects.equals(point(evidence.getCapturedLocation()), request.capturedLocation())
                && Objects.equals(evidence.getCaption(), request.caption());
        if (!matches) throw new ConflictException("Evidence reference already belongs to different metadata, location or author");
    }

    private void saveEvidenceSubmit(Intervention intervention, InterventionEvidence evidence, User user, UUID key, String hash) {
        var submit = new InterventionSubmission();
        submit.setActorUserId(user.getId());
        submit.setOperation("EVIDENCE_ANNOUNCE");
        submit.setIdempotencyKey(key);
        submit.setRequestSha256(hash);
        submit.setInterventionId(intervention.getId());
        submit.setEvidenceId(evidence.getId());
        submit.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        submissions.saveAndFlush(submit);
    }

    private InterventionEvidenceResponse evidenceResponse(InterventionEvidence evidence, Intervention intervention) {
        return new InterventionEvidenceResponse(evidence.getId(), intervention.getVersion(), evidence.getInterventionLocationId(),
                evidence.getAttemptNumber(), evidence.getClientReference(), references.code(evidence.getMomentItemId()),
                evidence.getGreenElementId(), evidence.getUploadedAt(), evidence.getUploadedAt() == null ? null : evidenceFileUrl(evidence), evidence.getCaption());
    }

    private String evidenceFileUrl(InterventionEvidence evidence) {
        return "/api/v1/interventions/" + evidence.getInterventionId() + "/evidences/" + evidence.getId() + "/file";
    }

    private Instant microseconds(Instant value) { return value == null ? null : value.truncatedTo(ChronoUnit.MICROS); }

    private InterventionLocation lockedLocation(Long locationId, Intervention intervention) {
        // All local commands take the aggregate lock first, then the child lock.
        return locations.findForUpdate(locationId, intervention.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Location not found in this intervention"));
    }

    private void requireExecutionAccess(User user, Intervention intervention) {
        role(user, "SUPERVISOR", "OPERARIO");
        // Read access to historical assignments does not preserve permission to execute
        // after leaving a team. Supervision and active membership are read from the DB.
        if (references.candidates(intervention.getTeamId()).stream()
                .noneMatch(candidate -> Objects.equals(candidate.get("id"), user.getId()))) {
            throw new AccessDeniedException("Execution requires an active assignment or supervision in this team");
        }
    }

    private Map<String, Object> executionSnapshot(InterventionLocation location) {
        var snapshot = new LinkedHashMap<String, Object>();
        snapshot.put("progressQuantity", location.getProgressQuantity());
        snapshot.put("executionNotes", location.getExecutionNotes());
        return snapshot;
    }

    private Intervention locked(Long id,User u){
        var i=interventions.findForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Intervention not found"));
        scope(u,i.getTeamId(),i.getAssignedToUserId());return i;
    }
    private void version(Intervention i,Long version){
        if(version==null)throw new ValidationException("Version is required");
        if(!i.getVersion().equals(version))throw new ConflictException("Intervention has changed; reload before retrying");
    }
    private void editable(Intervention i){
        if(!Set.of("PLANNED","ASSIGNED").contains(references.code(i.getPlanningStatusItemId()))||
            locations.findByInterventionIdOrderById(i.getId()).stream().anyMatch(l->l.getStartedAt()!=null||l.getAttemptNumber()>0))
            throw new BusinessRuleException("Planning is closed after execution starts or cancellation");
    }
    private Long item(Long id,String type,Long previous){
        var value=references.item(id,type).orElseThrow(()->new BusinessRuleException("Invalid "+type+" catalog reference"));
        if(!value.active()&&!Objects.equals(id,previous))throw new BusinessRuleException("Inactive "+type+" catalog reference");
        return id;
    }
    private Long status(String code){
        Long id=references.codeId("INTERVENTION_STATUS",code);
        if(id==null)throw new BusinessRuleException("Required intervention status is unavailable");return id;
    }
    private void applyHeader(Intervention i,Planning r){
        i.setInterventionClassItemId(item(r.classItemId(),"INTERVENTION_CLASS",i.getInterventionClassItemId()));
        if(r.typeItemId()==null){if(references.hasActiveChildren(r.classItemId()))throw new BusinessRuleException("Intervention type is required for this class");}
        else {
            item(r.typeItemId(),"INTERVENTION_TYPE",i.getInterventionTypeItemId());
            if(!Objects.equals(references.item(r.typeItemId(),"INTERVENTION_TYPE").orElseThrow().parentId(),r.classItemId()))throw new BusinessRuleException("Intervention type belongs to another class");
        }
        i.setInterventionTypeItemId(r.typeItemId());
        Long origin=r.originItemId()==null?references.codeId("INTERVENTION_ORIGIN","MAINTENANCE"):r.originItemId();
        Long reported=r.reportedByItemId()==null?references.codeId("INCIDENT_SOURCE","NONE"):r.reportedByItemId();
        item(origin,"INTERVENTION_ORIGIN",i.getOriginItemId());item(reported,"INCIDENT_SOURCE",i.getReportedByItemId());
        if(references.code(origin).equals("FINDING")&&references.code(reported).equals("NONE"))throw new BusinessRuleException("Finding requires a report source");
        if(r.requestedAt()!=null&&r.requestedAt().isAfter(r.scheduledDate()))throw new BusinessRuleException("Request date cannot follow scheduled date");
        i.setOriginItemId(origin);i.setReportedByItemId(reported);i.setScheduledDate(r.scheduledDate());i.setDescription(r.description());
        i.setExternalCode(r.externalCode());i.setRequestedAt(r.requestedAt());
    }
    private void applyLocations(Intervention i,List<Location> requests,boolean editing){
        if(requests==null||requests.isEmpty())throw new BusinessRuleException("At least one location is required");
        var all=locations.findByInterventionIdOrderById(i.getId());
        var seenIds=new HashSet<Long>();var seenRefs=new HashSet<UUID>();
        for(var r:requests){
            if(!seenRefs.add(r.clientReference()))throw new ValidationException("Duplicate location reference");
            var l=new InterventionLocation();
            if(r.id()!=null){
                if(!editing||!seenIds.add(r.id()))throw new ValidationException("Unexpected or duplicate location ID");
                l=all.stream().filter(v->v.getId().equals(r.id())&&!v.isDeleted()).findFirst().orElseThrow(()->new ResourceNotFoundException("Location not found in this intervention"));
                if(!Objects.equals(l.getClientReference(),r.clientReference()))throw new ConflictException("Location reference cannot change");
            }else{
                if(all.stream().anyMatch(v->v.getClientReference().equals(r.clientReference())))throw new ConflictException("Location reference was already used");
                l.setInterventionId(i.getId());l.setClientReference(r.clientReference());l.setStatusItemId(i.getPlanningStatusItemId());
            }
            if(new HashSet<>(r.elementIds()).size()!=r.elementIds().size())throw new ValidationException("Duplicate element in location");
            var requestedElements = new LinkedHashSet<Long>(r.elementIds());
            if (r.elementCodes()!=null) {
                var codes = new HashSet<String>();
                for (String code : r.elementCodes()) {
                    if (!codes.add(code.trim())) throw new ValidationException("Duplicate element code in location");
                    requestedElements.add(references.elementIdByCode(code.trim())
                            .orElseThrow(() -> new BusinessRuleException("Element code is not available")));
                }
            }
            if(r.zoneId()==null&&r.placeId()==null&&r.location()==null&&requestedElements.isEmpty())throw new BusinessRuleException("Each location needs a zone, place, point or element");
            var names=new ArrayList<String>();
            if(r.zoneId()!=null)names.add(spatialName("zone",r.zoneId(),l.getZoneId()));
            if(r.placeId()!=null)names.add(spatialName("place",r.placeId(),l.getPlaceId()));
            var oldElements=l.getId()==null?List.<InterventionElement>of():elements.findByInterventionLocationIdAndDeletedAtIsNull(l.getId());
            for(Long element:requestedElements)names.add(spatialName("element",element,oldElements.stream().anyMatch(e->e.getGreenElementId().equals(element))?element:null));
            String wkt=r.location()==null?null:"POINT("+r.location().longitude()+" "+r.location().latitude()+")";
            if(r.location()!=null)names.add(descriptions.describe(r.location().latitude(),r.location().longitude()).text());
            if(r.requestedQuantity()!=null&&r.unitItemId()==null)throw new BusinessRuleException("A quantity requires a local measurement unit");
            if(r.unitItemId()!=null)item(r.unitItemId(),"MEASUREMENT_UNIT",l.getUnitItemId());
            l.setZoneId(r.zoneId());l.setPlaceId(r.placeId());l.setLocation(wkt);l.setLocationDescription(String.join(" · ",names));
            l.setDescription(r.description());l.setUnitItemId(r.unitItemId());l.setRequestedQuantity(r.requestedQuantity());locations.saveAndFlush(l);
            for(var e:oldElements)if(!requestedElements.contains(e.getGreenElementId()))e.softDelete();
            elements.flush();
            for(Long element:requestedElements)if(oldElements.stream().noneMatch(e->e.getGreenElementId().equals(element))){
                var e=new InterventionElement();e.setInterventionId(i.getId());e.setInterventionLocationId(l.getId());e.setGreenElementId(element);elements.save(e);
            }
        }
        for(var l:all)if(!l.isDeleted()&&!seenIds.contains(l.getId())){
            l.softDelete();for(var e:elements.findByInterventionLocationIdAndDeletedAtIsNull(l.getId()))e.softDelete();
        }
    }
    private String spatialName(String kind,Long id,Long previous){
        return references.spatialName(kind,id,Objects.equals(id,previous)).orElseThrow(()->new BusinessRuleException("Invalid "+kind+" reference"));
    }
    private void setLocalStatus(Intervention i,String code){
        for(var l:locations.findByInterventionIdAndDeletedAtIsNullOrderById(i.getId()))l.setStatusItemId(status(code));
    }
    private Map<String,Object> snapshot(Intervention i){
        var m=new LinkedHashMap<String,Object>();m.put("classItemId",i.getInterventionClassItemId());m.put("typeItemId",i.getInterventionTypeItemId());
        m.put("scheduledDate",i.getScheduledDate());m.put("description",i.getDescription());m.put("teamId",i.getTeamId());
        m.put("assignedToUserId",i.getAssignedToUserId());m.put("originItemId",i.getOriginItemId());m.put("reportedByItemId",i.getReportedByItemId());
        m.put("externalCode",i.getExternalCode());m.put("requestedAt",i.getRequestedAt());
        m.put("locations",locations.findByInterventionIdAndDeletedAtIsNullOrderById(i.getId()).stream().map(this::locationSnapshot).toList());return m;
    }
    private void event(Intervention i,User u,String action,Long from,String reason,Map<String,Object> details){
        event(i, null, u, action, from, reason, details);
    }
    private void event(Intervention i, InterventionLocation location, User u, String action,
            Long from, String reason, Map<String,Object> details) {
        event(i, location, u, action, from, reason, details, location == null ? null : location.getAttemptNumber());
    }
    private void event(Intervention i, InterventionLocation location, User u, String action,
            Long from, String reason, Map<String,Object> details, Integer attemptNumber) {
        var e=new InterventionEvent();e.setInterventionId(i.getId());e.setActorUserId(u.getId());e.setActionCode(action);
        if (location != null) {
            e.setInterventionLocationId(location.getId());
            e.setAttemptNumber(attemptNumber);
        }
        e.setFromStatusItemId(from);
        e.setToStatusItemId(location == null ? i.getPlanningStatusItemId() : location.getStatusItemId());
        e.setReason(reason);
        // Normalize with the application's Jackson 3 mapper. Hibernate's JSON mapper
        // must receive JSON primitives rather than Java time objects or DTO records.
        @SuppressWarnings("unchecked") Map<String,Object> normalized=json.readValue(json.writeValueAsString(details),Map.class);
        e.setDetails(normalized);e.setOccurredAt(Instant.now().truncatedTo(ChronoUnit.MICROS));events.saveAndFlush(e);
    }
    private String hash(Object r){
        return sha256(json.writeValueAsString(r).getBytes(StandardCharsets.UTF_8));
    }
    private String sha256(byte[] bytes) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
        catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException("SHA-256 unavailable",ex);}
    }
}
