package pe.edu.pucp.hesperides.modules.interventions.service;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.interventions.dto.ActivityRequests.*;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionSubmission;
import pe.edu.pucp.hesperides.modules.interventions.repository.*;
import pe.edu.pucp.hesperides.shared.exception.*;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.time.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Global execution. Every command locks the activity, checks scope and commits one snapshot. */
@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class ActivitiesService {
    private final ActivitiesRepository repo;
    private final InterventionsService legacy;
    private final InterventionReferencesRepository references;
    private final InterventionSubmissionsRepository submissions;
    private final UsersRepository users;
    private final InterventionAccess access;
    private final InterventionExecutionSchedule schedule;
    private final Validator validator;
    private final ObjectMapper json;
    private final FileStorage storage;
    private final InterventionEvidenceFiles files;
    private final InterventionReviewPolicy reviewPolicy;
    private final InterventionCampusSelections campus;
    public record Creation(Map<String,Object> data,boolean replay) {}

    private User actor() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated())throw new UnauthorizedException("Authentication required");
        var u=users.findActiveByEmail(auth.getName()).orElseThrow(()->new UnauthorizedException("Account unavailable"));
        if(!u.isActive()||!u.getRoleItem().isActive()||u.getRoleItem().isDeleted())throw new UnauthorizedException("Account unavailable");
        role(u,"ADMIN","COORDINADOR","SUPERVISOR");return u;
    }
    private void role(User u,String... roles) {
        if(!Arrays.asList(roles).contains(u.getRoleCode()))throw new AccessDeniedException("Action not allowed for this role");
    }
    private void validate(Object r) {
        if(r==null||!validator.validate(r).isEmpty())throw new ValidationException("Invalid activity request");
    }
    private long number(Map<String,Object> row,String key) {return ((Number)row.get(key)).longValue();}
    private Long nullableNumber(Map<String,Object> row,String key) {return row.get(key)==null?null:number(row,key);}
    private Instant instant(Object value) {
        if(value==null)return null;
        if(value instanceof java.sql.Timestamp t)return t.toLocalDateTime().toInstant(ZoneOffset.UTC);
        if(value instanceof LocalDateTime t)return t.toInstant(ZoneOffset.UTC);
        return (Instant)value;
    }
    private String hash(Object value) {return digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8));}
    private String digest(byte[] bytes) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    private long item(String type,String code) {
        Long id=references.codeId(type,code);
        if(id==null)throw new BusinessRuleException("Activity catalog unavailable");
        return id;
    }
    private void supervisor(Long id) {
        if(id!=null && !Boolean.TRUE.equals(repo.sql().queryForObject("""
            SELECT exists(SELECT 1 FROM users u JOIN catalog_items r ON r.id=u.role_item_id
            WHERE u.id=? AND u.is_active AND u.deleted_at IS NULL AND r.code='SUPERVISOR'
            AND r.is_active AND r.deleted_at IS NULL)
            """,Boolean.class,id)))throw new BusinessRuleException("Responsible supervisor is unavailable");
    }
    private Map<String,Object> locked(long id,User u) {
        var x=repo.execution(id,true);access.requireRead(u,id,null,null);return x;
    }
    private void version(Map<String,Object> x,Long version) {
        if(version==null||number(x,"version")!=version)throw new ConflictException("Activity has changed; reload before retrying");
    }
    private void mutable(Map<String,Object> x) {
        if(Set.of("FINISHED","CANCELLED").contains(x.get("status_code")))throw new BusinessRuleException("Activity is closed");
    }
    private void writer(Map<String,Object> x,User u) {
        role(u,"SUPERVISOR");var owner=nullableNumber(x,"responsible_supervisor_user_id");
        if(owner!=null&&!owner.equals(u.getId()))throw new AccessDeniedException("Only the responsible supervisor may upload progress");
    }
    private void bump(long id) {
        repo.sql().update("UPDATE activity_executions SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE intervention_id=?",id);
        repo.sql().update("UPDATE interventions SET version=(SELECT version FROM activity_executions WHERE intervention_id=?),updated_at=CURRENT_TIMESTAMP WHERE id=?",id,id);
    }
    private String compatibility(String status) {
        return switch(status){case "EXECUTED"->"COMPLETED";case "FINISHED"->"VALIDATED";default->status;};
    }
    private void event(long id,User u,String action,String from,String to,Map<String,Object> details) {
        repo.sql().update("INSERT INTO intervention_events(intervention_id,action_code,actor_user_id,from_status_item_id,to_status_item_id,details) VALUES (?,?,?,?,?,?::jsonb)",
            id,action,u.getId(),item("INTERVENTION_STATUS",compatibility(from)),item("INTERVENTION_STATUS",compatibility(to)),json.writeValueAsString(details));
    }

    @Transactional public Creation create(Planning r,UUID key) {
        validate(r);var u=actor();role(u,"ADMIN","COORDINADOR");
        if(key==null)throw new ValidationException("Idempotency-Key UUID is required");
        if(!references.lockSubmission(u.getId(),key))throw new ConflictException("Submission is in progress");
        var prior=submissions.findByActorUserIdAndOperationAndIdempotencyKeyAndDeletedAtIsNull(u.getId(),"ACTIVITY_CREATE",key);
        if(prior.isPresent()) {
            if(!prior.get().getRequestSha256().equals(hash(r)))throw new ConflictException("Idempotency key has different content");
            return new Creation(detail(prior.get().getInterventionId()),true);
        }
        if(r.planning().campusSelectionRevision()==null)throw new ValidationException("Global activities require campus selection");
        supervisor(r.responsibleSupervisorUserId());
        var created=legacy.create(r.planning(),key);
        if(created.replay())throw new ConflictException("Idempotency key already belongs to a legacy creation");
        long id=created.intervention().getId();
        repo.sql().update("INSERT INTO activity_executions(intervention_id,status_item_id,responsible_supervisor_user_id) VALUES (?,?,?)",id,item("ACTIVITY_STATUS","PLANNED"),r.responsibleSupervisorUserId());
        var s=new InterventionSubmission();s.setActorUserId(u.getId());s.setOperation("ACTIVITY_CREATE");s.setIdempotencyKey(key);
        s.setRequestSha256(hash(r));s.setInterventionId(id);s.setExpiresAt(Instant.now().plusSeconds(86400));submissions.saveAndFlush(s);
        return new Creation(detail(id),false);
    }
    @Transactional public Map<String,Object> updatePlanning(long id,Planning r) {
        validate(r);var u=actor();role(u,"ADMIN","COORDINADOR");var x=locked(id,u);version(x,r.planning().version());
        if(!x.get("status_code").equals("PLANNED"))throw new BusinessRuleException("Planning is closed after the first progress");
        if(!Objects.equals(nullableNumber(x,"responsible_supervisor_user_id"),r.responsibleSupervisorUserId()))role(u,"COORDINADOR");
        supervisor(r.responsibleSupervisorUserId());
        if(r.planning().campusSelectionRevision()==null)throw new ValidationException("Global activities require campus selection");
        legacy.updateActivityPlanning(id,r.planning());
        repo.sql().update("UPDATE activity_executions SET responsible_supervisor_user_id=? WHERE intervention_id=?",r.responsibleSupervisorUserId(),id);
        bump(id);event(id,u,"ACTIVITY_PLANNING_UPDATED","PLANNED","PLANNED",Map.of());return detail(id);
    }
    @Transactional public Map<String,Object> responsible(long id,Responsible r) {
        validate(r);var u=actor();role(u,"COORDINADOR");var x=locked(id,u);version(x,r.version());mutable(x);supervisor(r.responsibleSupervisorUserId());
        if(x.get("started_at")!=null&&r.responsibleSupervisorUserId()==null)throw new BusinessRuleException("An executing activity needs a responsible supervisor");
        repo.sql().update("UPDATE activity_executions SET responsible_supervisor_user_id=? WHERE intervention_id=?",r.responsibleSupervisorUserId(),id);
        bump(id);var details=new LinkedHashMap<String,Object>();details.put("previousResponsible",x.get("responsible_supervisor_user_id"));details.put("responsible",r.responsibleSupervisorUserId());
        event(id,u,"ACTIVITY_RESPONSIBLE_CHANGED",(String)x.get("status_code"),(String)x.get("status_code"),details);return detail(id);
    }

    @Transactional public Map<String,Object> progress(long id,Progress r) {
        validate(r);var u=actor();var x=locked(id,u);writer(x,u);
        if(!repo.lockReference("progress",r.clientReference()))throw new ConflictException("Progress submission is in progress");
        var replay=repo.progress(r.clientReference());
        if(replay.isPresent()) {
            var p=replay.get();
            if(number(p,"intervention_id")!=id||number(p,"actor_user_id")!=u.getId()||!p.get("request_sha256").equals(hash(r)))
                throw new ConflictException("Progress reference has different content");
            return detail(id);
        }
        version(x,r.version());mutable(x);
        var scheduled=x.get("scheduled_date");schedule.requireAvailable(scheduled instanceof java.sql.Date d?d.toLocalDate():(LocalDate)scheduled);
        var live=repo.locations(id).stream().map(l->number(l,"id")).collect(java.util.stream.Collectors.toSet());
        var selected=new HashSet<Long>();boolean allDone=true;
        for(var target:r.targets()) {
            if(!selected.add(target.locationId())||!live.contains(target.locationId()))throw new ValidationException("Duplicate or foreign activity target");
            boolean partial=target.statusCode().equals("PARTIAL");
            if(partial?(target.partialDescription()==null||target.partialDescription().isBlank()):target.partialDescription()!=null)
                throw new ValidationException("Only a partial target requires a description");
            allDone&=target.statusCode().equals("COMPLETED");
        }
        if(!live.equals(selected))throw new ValidationException("Progress must include every activity target");
        boolean hundred=r.percentage().compareTo(new BigDecimal("100"))==0;
        if(hundred!=allDone)throw new BusinessRuleException("100 percent requires all targets completed, and vice versa");
        var evidenceIds=r.evidenceIds()==null?List.<Long>of():r.evidenceIds();
        if(new HashSet<>(evidenceIds).size()!=evidenceIds.size())throw new ValidationException("Duplicate evidence");
        for(long eid:evidenceIds) {
            var e=repo.photo(id,eid);
            if(number(e,"uploaded_by_user_id")!=u.getId()||e.get("progress_entry_id")!=null||e.get("uploaded_at")==null)
                throw new BusinessRuleException("New progress evidence must be received, unbound and owned by its author");
        }
        if(hundred&&reviewPolicy.requiresPhotoOnCompletion())requirePhotos(id,live,new HashSet<>(evidenceIds));
        long entry=repo.sql().queryForObject("INSERT INTO activity_progress_entries(intervention_id,client_reference,request_sha256,actor_user_id,progress_percentage,description) VALUES (?,?,?,?,?,?) RETURNING id",Long.class,id,r.clientReference(),hash(r),u.getId(),r.percentage(),r.description());
        var now=java.sql.Timestamp.valueOf(LocalDateTime.ofInstant(Instant.now(),ZoneOffset.UTC));
        for(var target:r.targets()) {
            repo.sql().update("INSERT INTO activity_progress_targets(progress_entry_id,intervention_id,intervention_location_id,status_item_id,partial_description) VALUES (?,?,?,?,?)",entry,id,target.locationId(),item("ACTIVITY_TARGET_STATUS",target.statusCode()),target.partialDescription());
            String oldStatus=switch(target.statusCode()){case "COMPLETED"->"COMPLETED";case "PARTIAL"->"IN_PROGRESS";default->"ASSIGNED";};
            // Compatibility projection only; percentages/quantities and attempts are never fabricated.
            repo.sql().update("UPDATE intervention_locations SET status_item_id=?,started_at=CASE WHEN ? THEN COALESCE(started_at,?) ELSE started_at END,executed_by_user_id=CASE WHEN ? THEN COALESCE(executed_by_user_id,?) ELSE executed_by_user_id END,completed_at=?,validated_at=NULL,validated_by_user_id=NULL,updated_at=? WHERE id=? AND intervention_id=?",
                item("INTERVENTION_STATUS",oldStatus),!target.statusCode().equals("NOT_STARTED"),now,!target.statusCode().equals("NOT_STARTED"),u.getId(),target.statusCode().equals("COMPLETED")?now:null,now,target.locationId(),id);
        }
        for(long eid:evidenceIds)repo.sql().update("UPDATE activity_evidences SET progress_entry_id=?,updated_at=? WHERE id=? AND intervention_id=?",entry,now,eid,id);
        String state=hundred?"EXECUTED":"IN_PROGRESS";
        repo.sql().update("UPDATE activity_executions SET legacy_baseline_pending=FALSE,responsible_supervisor_user_id=COALESCE(responsible_supervisor_user_id,?),progress_percentage=?,status_item_id=?,started_at=COALESCE(started_at,?),executed_at=? WHERE intervention_id=?",u.getId(),r.percentage(),item("ACTIVITY_STATUS",state),now,hundred?now:null,id);
        repo.sql().update("UPDATE interventions SET planning_status_item_id=? WHERE id=?",item("INTERVENTION_STATUS","ASSIGNED"),id);
        bump(id);event(id,u,"ACTIVITY_PROGRESS_SAVED",(String)x.get("status_code"),state,Map.of("progressEntryId",entry,"percentage",r.percentage()));
        return detail(id);
    }

    private void requirePhotos(long id,Set<Long> locations,Set<Long> newEvidence) {
        var covered=new HashSet<Long>();
        for(var e:repo.photos(id))if(e.get("uploaded_at")!=null&&(e.get("progress_entry_id")!=null||Boolean.TRUE.equals(e.get("legacy_counts_for_completion"))||newEvidence.contains(number(e,"id"))))
            covered.add(nullableNumber(e,"intervention_location_id"));
        if(!covered.containsAll(locations))throw new BusinessRuleException("At least one received photo is required for every activity target");
    }

    @Transactional public Map<String,Object> approve(long id,Version r) {
        validate(r);var u=actor();role(u,"COORDINADOR");var x=locked(id,u);version(x,r.version());
        if(!x.get("status_code").equals("EXECUTED"))throw new BusinessRuleException("Only an executed activity may be finished");
        if(Boolean.TRUE.equals(x.get("legacy_baseline_pending")))throw new BusinessRuleException("Record the first global progress before approval");
        requirePhotos(id,repo.locations(id).stream().map(l->number(l,"id")).collect(java.util.stream.Collectors.toSet()),Set.of());
        if(reviewPolicy.blocksPendingOnApproval()&&repo.photos(id).stream().anyMatch(e->e.get("progress_entry_id")!=null&&e.get("uploaded_at")==null))
            throw new BusinessRuleException("Receive all bound activity photos before approval");
        if(Boolean.TRUE.equals(repo.sql().queryForObject("SELECT exists(SELECT 1 FROM activity_progress_entries WHERE intervention_id=? AND actor_user_id=?) OR exists(SELECT 1 FROM intervention_locations WHERE intervention_id=? AND deleted_at IS NULL AND executed_by_user_id=?)",Boolean.class,id,u.getId(),id,u.getId())))
            throw new AccessDeniedException("A reviewer cannot approve their own execution or reporting");
        var now=java.sql.Timestamp.valueOf(LocalDateTime.ofInstant(Instant.now(),ZoneOffset.UTC));
        repo.sql().update("UPDATE activity_executions SET status_item_id=?,finished_at=?,finished_by_user_id=? WHERE intervention_id=?",item("ACTIVITY_STATUS","FINISHED"),now,u.getId(),id);
        repo.sql().update("UPDATE intervention_locations SET status_item_id=?,validated_at=?,validated_by_user_id=? WHERE intervention_id=? AND deleted_at IS NULL",item("INTERVENTION_STATUS","VALIDATED"),now,u.getId(),id);
        bump(id);event(id,u,"ACTIVITY_FINISHED","EXECUTED","FINISHED",Map.of());return detail(id);
    }
    @Transactional public Map<String,Object> cancel(long id,Cancel r) {
        validate(r);var u=actor();role(u,"COORDINADOR");var x=locked(id,u);version(x,r.version());mutable(x);
        repo.sql().update("UPDATE activity_executions SET status_item_id=?,cancelled_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC',cancelled_by_user_id=?,cancellation_reason=? WHERE intervention_id=?",item("ACTIVITY_STATUS","CANCELLED"),u.getId(),r.reason(),id);
        repo.sql().update("UPDATE interventions SET planning_status_item_id=? WHERE id=?",item("INTERVENTION_STATUS","CANCELLED"),id);
        repo.sql().update("UPDATE intervention_locations SET status_item_id=? WHERE intervention_id=? AND deleted_at IS NULL",item("INTERVENTION_STATUS","CANCELLED"),id);
        bump(id);var extra=new LinkedHashMap<String,Object>();extra.put("reason",r.reason());event(id,u,"ACTIVITY_CANCELLED",(String)x.get("status_code"),"CANCELLED",extra);return detail(id);
    }

    @Transactional public Map<String,Object> announce(long id,Evidence r) {
        validate(r);var u=actor();var x=locked(id,u);writer(x,u);
        if(!repo.lockReference("evidence",r.clientReference()))throw new ConflictException("Evidence submission is in progress");
        var existing=repo.sql().queryForList("SELECT * FROM activity_evidences WHERE client_reference=?",r.clientReference());
        if(!existing.isEmpty()) {
            var e=existing.get(0);
            if(number(e,"intervention_id")!=id||number(e,"uploaded_by_user_id")!=u.getId()||!Objects.equals(nullableNumber(e,"intervention_location_id"),r.locationId())
                ||number(e,"moment_item_id")!=item("EVIDENCE_MOMENT",r.momentCode())||!Objects.equals(e.get("caption"),r.caption())||e.get("deleted_at")!=null)
                throw new ConflictException("Evidence reference has different content");
            return publicPhoto(e);
        }
        version(x,r.version());mutable(x);
        if(!Set.of("BEFORE","AFTER","UNSPECIFIED").contains(r.momentCode()))throw new ValidationException("Invalid evidence moment");
        if(r.locationId()!=null&&repo.locations(id).stream().noneMatch(l->number(l,"id")==r.locationId()))throw new ValidationException("Foreign evidence target");
        long eid=repo.sql().queryForObject("INSERT INTO activity_evidences(intervention_id,intervention_location_id,client_reference,moment_item_id,caption,uploaded_by_user_id) VALUES (?,?,?,?,?,?) RETURNING id",Long.class,id,r.locationId(),r.clientReference(),item("EVIDENCE_MOMENT",r.momentCode()),r.caption(),u.getId());
        bump(id);return publicPhoto(repo.photo(id,eid));
    }
    @Transactional public Map<String,Object> upload(long id,long evidenceId,MultipartFile file) {
        var u=actor();var x=locked(id,u);writer(x,u);var e=repo.photo(id,evidenceId);
        if(number(e,"uploaded_by_user_id")!=u.getId())throw new AccessDeniedException("Only the evidence author may upload its file");
        byte[] bytes;
        try {bytes=file.getBytes();}catch(java.io.IOException ex){throw new ValidationException("Photo could not be read");}
        var format=files.validate(bytes);String digest=digest(bytes);
        if(e.get("uploaded_at")!=null) {
            if(!digest.equals(e.get("content_sha256")))throw new ConflictException("Evidence file is immutable");
            return publicPhoto(e);
        }
        mutable(x);String key="activities/"+id+"/"+e.get("client_reference")+"/"+digest+"."+format.extension();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)try{storage.delete(key);}catch(RuntimeException ignored){/* An orphan may be cleaned without losing committed evidence. */}}
        });
        storage.put(key,bytes,format.contentType());
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("photo").replace('\\','/');name=name.substring(name.lastIndexOf('/')+1);if(name.length()>255)name=name.substring(name.length()-255);
        repo.sql().update("UPDATE activity_evidences SET storage_key=?,original_filename=?,content_type=?,size_bytes=?,content_sha256=?,uploaded_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC',updated_at=CURRENT_TIMESTAMP WHERE id=?",key,name,format.contentType(),bytes.length,digest,evidenceId);
        bump(id);return publicPhoto(repo.photo(id,evidenceId));
    }
    public InterventionsService.EvidenceFile file(long id,long evidenceId) {
        detailAccess(id,actor());var e=repo.photo(id,evidenceId);
        if(e.get("uploaded_at")==null)throw new ConflictException("Evidence file is pending");
        return new InterventionsService.EvidenceFile(storage.read((String)e.get("storage_key")),(String)e.get("content_type"));
    }
    private Map<String,Object> publicPhoto(Map<String,Object> e) {
        var p=new LinkedHashMap<String,Object>();
        for(String k:List.of("id","client_reference","progress_entry_id","intervention_location_id","caption","uploaded_by_user_id"))p.put(switch(k){case "client_reference"->"clientReference";case "progress_entry_id"->"progressEntryId";case "intervention_location_id"->"locationId";case "uploaded_by_user_id"->"uploadedByUserId";default->k;},e.get(k));
        p.put("uploadedAt",instant(e.get("uploaded_at")));
        p.put("historical",e.get("legacy_evidence_id")!=null);
        p.put("fileUrl",e.get("uploaded_at")==null?null:"/api/v1/activities/"+e.get("intervention_id")+"/evidences/"+e.get("id")+"/file");return p;
    }
    private Map<String,Object> detailAccess(long id,User u) {var x=repo.execution(id,false);access.requireRead(u,id,null,null);return x;}
    private List<Map<String,Object>> previousReports(Map<String,Object> execution) {
        if(execution.get("legacy_snapshot")==null)return List.of();
        var original=json.readTree(execution.get("legacy_snapshot").toString()).get("locations");
        if(original==null||!original.isArray())return List.of();
        var reports=new ArrayList<Map<String,Object>>();
        for(var location:original) {
            var notes=location.get("execution_notes");if(notes==null||notes.isNull()||notes.asString().isBlank())continue;
            var report=new LinkedHashMap<String,Object>();report.put("locationId",location.get("id").asLong());report.put("description",notes.asString());
            var author=location.get("executed_by_user_id");report.put("actorName",author==null||author.isNull()?null:users.findById(author.asLong()).map(User::getFullName).orElse(null));
            var date=location.get("completed_at");if(date==null||date.isNull())date=location.get("started_at");
            report.put("occurredAt",date==null||date.isNull()?null:LocalDateTime.parse(date.asString()).toInstant(ZoneOffset.UTC));reports.add(report);
        }
        return reports;
    }
    public InterventionCampusSelections.Options mapOptions(long id) {
        detailAccess(id,actor());
        var plan=legacy.findById(id).getLocations();var zoneIds=new HashSet<Long>();var specimenIds=new HashSet<Long>();
        for(var target:plan) {
            if(target.get("zoneId") instanceof Number z)zoneIds.add(z.longValue());
            if(target.get("elementIds") instanceof List<?> ids)for(var value:ids)if(value instanceof Number n)specimenIds.add(n.longValue());
        }
        var live=campus.options();
        return new InterventionCampusSelections.Options(live.selectionRevision(),live.zones().stream().filter(z->zoneIds.contains(z.id())).toList(),live.specimens().stream().filter(s->specimenIds.contains(s.id())).toList());
    }
    public Map<String,Object> detail(long id) {
        var u=actor();var x=detailAccess(id,u);var old=legacy.findById(id);
        var result=new LinkedHashMap<String,Object>();
        result.put("id",id);result.put("code",old.getCode());result.put("activityTitle",old.getActivityTitle());result.put("version",x.get("version"));
        result.put("classItemId",old.getClassItemId());result.put("typeItemId",old.getTypeItemId());result.put("scheduledDate",old.getScheduledDate());
        result.put("description",old.getDescription());result.put("usesCuttingMachinery",old.isUsesCuttingMachinery());result.put("campusSelectionRevision",old.getCampusSelectionRevision());result.put("plannedSurfaceM2",old.getPlannedSurfaceM2());
        result.put("sourceIncidents",old.getSourceIncidents());result.put("executionBlockedUntil",old.getExecutionBlockedUntil());
        result.put("statusCode",x.get("status_code"));result.put("percentage",x.get("progress_percentage"));result.put("responsibleSupervisorUserId",x.get("responsible_supervisor_user_id"));
        result.put("legacyBaselinePending",Boolean.TRUE.equals(x.get("legacy_baseline_pending")));
        result.put("previousReports",previousReports(x));
        result.put("previousHistory",Boolean.TRUE.equals(x.get("legacy_imported"))?old.getHistory().stream().filter(e->!String.valueOf(e.get("actionCode")).startsWith("ACTIVITY_")).toList():List.of());
        result.put("startedAt",instant(x.get("started_at")));result.put("executedAt",instant(x.get("executed_at")));result.put("finishedAt",instant(x.get("finished_at")));result.put("cancelledAt",instant(x.get("cancelled_at")));result.put("cancellationReason",x.get("cancellation_reason"));
        result.put("elapsedSeconds",x.get("started_at")==null||x.get("executed_at")==null?null:Math.max(0,Duration.between(instant(x.get("started_at")),instant(x.get("executed_at"))).getSeconds()));
        var targets=new HashMap<Long,Map<String,Object>>();
        for(var target:repo.targets(id))targets.put(number(target,"intervention_location_id"),target);
        var targetRows=new ArrayList<Map<String,Object>>();
        for(var l:old.getLocations()) {
            var row=new LinkedHashMap<String,Object>();
            for(String k:List.of("id","clientReference","zoneId","placeId","location","description","locationDescription","zoneBoundary","elementIds","linkedElementCodes"))row.put(k,l.get(k));
            var snapshot=targets.getOrDefault(number(l,"id"),Map.of());
            String initial="NOT_STARTED";Object notes=null;
            if(Boolean.TRUE.equals(x.get("legacy_baseline_pending"))) {
                initial=switch(String.valueOf(l.get("statusCode"))){case "COMPLETED","VALIDATED"->"COMPLETED";case "IN_PROGRESS","OBSERVED"->"PARTIAL";default->"NOT_STARTED";};
                if(initial.equals("PARTIAL"))notes=l.get("executionNotes");
            }
            row.put("statusCode",snapshot.getOrDefault("status_code",initial));row.put("partialDescription",snapshot.isEmpty()?notes:snapshot.get("partial_description"));targetRows.add(row);
        }
        result.put("targets",targetRows);result.put("evidences",repo.photos(id).stream().map(this::publicPhoto).toList());
        var history=repo.sql().queryForList("SELECT p.id,p.actor_user_id,p.progress_percentage,p.description,p.occurred_at,u.first_name||' '||u.last_name actor_name FROM activity_progress_entries p JOIN users u ON u.id=p.actor_user_id WHERE p.intervention_id=? ORDER BY p.id",id);
        var entries=new ArrayList<Map<String,Object>>();
        for(var h:history) {
            var entry=new LinkedHashMap<String,Object>();entry.put("id",h.get("id"));entry.put("actorUserId",h.get("actor_user_id"));entry.put("actorName",h.get("actor_name"));entry.put("percentage",h.get("progress_percentage"));entry.put("description",h.get("description"));entry.put("occurredAt",instant(h.get("occurred_at")));
            entry.put("targets",repo.sql().queryForList("SELECT p.intervention_location_id AS \"locationId\",s.code AS \"statusCode\",p.partial_description AS \"partialDescription\" FROM activity_progress_targets p JOIN catalog_items s ON s.id=p.status_item_id WHERE p.progress_entry_id=? ORDER BY p.intervention_location_id",h.get("id")));entries.add(entry);
        }
        result.put("history",entries);result.put("events",old.getHistory());
        var actions=new ArrayList<String>();String state=(String)x.get("status_code");
        if(!Set.of("FINISHED","CANCELLED").contains(state)) {
            if(u.getRoleCode().equals("COORDINADOR")){actions.add("cancel");actions.add("responsible");if(state.equals("EXECUTED")&&!Boolean.TRUE.equals(x.get("legacy_baseline_pending")))actions.add("approve");}
            if(u.getRoleCode().equals("SUPERVISOR")&&schedule.canExecute(old.getScheduledDate()))actions.add("progress");
            if(state.equals("PLANNED")&&old.getCampusSelectionRevision()!=null&&Set.of("ADMIN","COORDINADOR").contains(u.getRoleCode()))actions.add("planning");
        }
        result.put("allowedActions",actions);return result;
    }
    public Map<String,Object> list(int page,int size,String status) {
        var u=actor();if(page<0||size<1||size>100)throw new ValidationException("Invalid activity page");
        if(status!=null&&!Set.of("PLANNED","IN_PROGRESS","EXECUTED","FINISHED","CANCELLED").contains(status))throw new ValidationException("Invalid activity status");
        String from=" FROM activity_executions x JOIN interventions i ON i.id=x.intervention_id JOIN catalog_items s ON s.id=x.status_item_id WHERE x.deleted_at IS NULL AND i.deleted_at IS NULL AND (CAST(? AS varchar) IS NULL OR s.code=?) AND (? IN ('ADMIN','COORDINADOR') OR (x.responsible_supervisor_user_id=? OR (x.responsible_supervisor_user_id IS NULL AND (s.code='PLANNED' OR (x.legacy_baseline_pending AND s.code<>'CANCELLED')))))";
        var args=new ArrayList<Object>(Arrays.asList(status,status,u.getRoleCode(),u.getId()));
        long count=repo.sql().queryForObject("SELECT count(*)"+from,Long.class,args.toArray());
        args.add(size);args.add((long)page*size);
        var ids=repo.sql().queryForList("SELECT i.id"+from+" ORDER BY i.scheduled_date DESC,i.id DESC LIMIT ? OFFSET ?",Long.class,args.toArray());
        return Map.of("content",ids.stream().map(this::detail).toList(),"page",Map.of("number",page,"size",size,"totalElements",count,"totalPages",(count+size-1)/size));
    }
    public Map<String,Object> options() {
        var u=actor();var result=new LinkedHashMap<String,Object>();result.put("catalogs",legacy.options().get("catalogs"));
        result.put("statuses",repo.sql().queryForList("SELECT i.id,i.code,i.label FROM catalog_items i JOIN catalog_types t ON t.id=i.catalog_type_id WHERE t.code='ACTIVITY_STATUS' AND i.is_active AND i.deleted_at IS NULL ORDER BY i.sort_order"));
        result.put("supervisors",Set.of("ADMIN","COORDINADOR").contains(u.getRoleCode())?repo.sql().queryForList("SELECT u.id,u.first_name||' '||u.last_name name FROM users u JOIN catalog_items r ON r.id=u.role_item_id WHERE u.is_active AND u.deleted_at IS NULL AND r.code='SUPERVISOR' AND r.is_active AND r.deleted_at IS NULL ORDER BY u.last_name,u.id"):List.of());return result;
    }
}
