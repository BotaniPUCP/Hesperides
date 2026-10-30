package pe.edu.pucp.hesperides.modules.interventions.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.data.domain.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Filter;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

/** Calculates status and applies scope/filters before pagination. */
@Repository
@RequiredArgsConstructor
public class InterventionQueriesRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final InterventionSearchRepository search;
    public static final String FROM = """
        from interventions i join catalog_items ps on ps.id=i.planning_status_item_id
        cross join lateral (
          select count(*) location_count,
            count(*) filter(where s.code in ('COMPLETED','VALIDATED')) completed_location_count,
            count(*) filter(where s.code='VALIDATED') validated_location_count,
            min(l.started_at) started_at,
            case when bool_and(s.code in ('COMPLETED','VALIDATED')) then max(l.completed_at) end completed_at,
            case when bool_and(s.code='VALIDATED') then max(l.validated_at) end validated_at,
            case when ps.code in ('PLANNED','CANCELLED') then ps.code
              when bool_and(s.code='VALIDATED') then 'VALIDATED'
              when bool_or(s.code='OBSERVED') then 'OBSERVED'
              when bool_and(s.code in ('COMPLETED','VALIDATED')) then 'COMPLETED'
              when bool_or(s.code in ('IN_PROGRESS','COMPLETED','VALIDATED')) then 'IN_PROGRESS'
              else 'ASSIGNED' end status_code
          from intervention_locations l join catalog_items s on s.id=l.status_item_id
          where l.intervention_id=i.id and l.deleted_at is null
        ) a
        """;
    public static final String SELECT = """
        select i.*,ps.code planning_status_code,a.*,
          (select count(*) from intervention_evidences e join intervention_locations el on el.id=e.intervention_location_id
           where e.intervention_id=i.id and e.uploaded_at is null and e.deleted_at is null and el.deleted_at is null) pending_evidence_count
        """;

    public Page<InterventionSummaryResponse> findAll(Filter f,Long actor,String role,Pageable page) {
        var order=new ArrayList<Sort.Order>();
        for(var s:page.getSort()){
            String col=switch(s.getProperty()){
                case "scheduledDate"->"scheduled_date"; case "code"->"code";case "createdAt"->"created_at";case "id"->"id";
                default->throw new ValidationException("Unsupported intervention sort field");
            };
            order.add(new Sort.Order(s.getDirection(),col));
        }
        if(order.isEmpty())order.add(Sort.Order.desc("scheduled_date"));
        if(page.getSort().getOrderFor("id")==null)order.add(Sort.Order.desc("id"));
        var result=search.search(actor,role,f.classItemId(),f.typeItemId(),f.teamId(),f.assignedToUserId(),f.statusCode(),
            f.dateFrom(),f.dateTo(),f.zoneId(),f.placeId(),f.locationStatusCode(),f.greenElementId(),f.greenElementCode(),
            PageRequest.of(page.getPageNumber(),page.getPageSize(),Sort.by(order)));
        return new PageImpl<>(result.getContent().stream().map(this::summary).toList(),page,result.getTotalElements());
    }
    private InterventionSummaryResponse summary(Map<String,Object> r){
        var d=new InterventionSummaryResponse();
        d.setId(number(r,"id"));d.setCode((String)r.get("code"));d.setVersion(number(r,"version"));
        d.setClassItemId(number(r,"intervention_class_item_id"));d.setTypeItemId(number(r,"intervention_type_item_id"));
        d.setPlanningStatusCode((String)r.get("planning_status_code"));d.setStatusCode((String)r.get("status_code"));
        d.setTeamId(number(r,"team_id"));d.setAssignedToUserId(number(r,"assigned_to_user_id"));
        Object date=r.get("scheduled_date");d.setScheduledDate(date instanceof java.sql.Date sqlDate?sqlDate.toLocalDate():(java.time.LocalDate)date);
        d.setStartedAt(instant(r.get("started_at")));d.setCompletedAt(instant(r.get("completed_at")));d.setValidatedAt(instant(r.get("validated_at")));
        d.setLocationCount(number(r,"location_count").intValue());d.setCompletedLocationCount(number(r,"completed_location_count").intValue());
        d.setValidatedLocationCount(number(r,"validated_location_count").intValue());d.setPendingEvidenceCount(number(r,"pending_evidence_count").intValue());return d;
    }
    private Long number(Map<String,Object> r,String key){return r.get(key)==null?null:((Number)r.get(key)).longValue();}
    private java.time.Instant instant(Object value){
        if(value==null)return null;
        if(value instanceof java.sql.Timestamp t)return t.toLocalDateTime().toInstant(java.time.ZoneOffset.UTC);
        if(value instanceof java.time.LocalDateTime t)return t.toInstant(java.time.ZoneOffset.UTC);
        return (java.time.Instant)value;
    }
    public Optional<InterventionDetailResponse> detail(Long id){
        return jdbc.query(SELECT+FROM+" where i.id=:id and i.deleted_at is null",Map.of("id",id),(r,n)->{
            var d=summary(r,new InterventionDetailResponse());
            d.setDescription(r.getString("description"));d.setOriginItemId(r.getLong("origin_item_id"));d.setReportedByItemId(r.getLong("reported_by_item_id"));
            d.setExternalCode(r.getString("external_code"));var requested=r.getDate("requested_at");d.setRequestedAt(requested==null?null:requested.toLocalDate());
            d.setCreatedAt(instant(r.getObject("created_at",java.time.LocalDateTime.class)));
            d.setUpdatedAt(instant(r.getObject("updated_at",java.time.LocalDateTime.class)));return d;
        }).stream().findFirst();
    }
    private <T extends InterventionSummaryResponse> T summary(ResultSet r,T d)throws SQLException{
        d.setId(r.getLong("id"));d.setCode(r.getString("code"));d.setVersion(r.getLong("version"));
        d.setClassItemId(r.getLong("intervention_class_item_id"));d.setTypeItemId(r.getObject("intervention_type_item_id",Long.class));
        d.setPlanningStatusCode(r.getString("planning_status_code"));d.setStatusCode(r.getString("status_code"));
        d.setTeamId(r.getObject("team_id",Long.class));d.setAssignedToUserId(r.getObject("assigned_to_user_id",Long.class));
        d.setScheduledDate(r.getDate("scheduled_date").toLocalDate());
        // V025 timestamps persist UTC without a zone, as Hibernate does for Instant.
        // Read the stored wall time explicitly, independently of the JVM time zone.
        d.setStartedAt(instant(r.getObject("started_at",java.time.LocalDateTime.class)));
        d.setCompletedAt(instant(r.getObject("completed_at",java.time.LocalDateTime.class)));
        d.setValidatedAt(instant(r.getObject("validated_at",java.time.LocalDateTime.class)));
        d.setLocationCount(r.getInt("location_count"));d.setCompletedLocationCount(r.getInt("completed_location_count"));
        d.setValidatedLocationCount(r.getInt("validated_location_count"));d.setPendingEvidenceCount(r.getInt("pending_evidence_count"));return d;
    }
}
