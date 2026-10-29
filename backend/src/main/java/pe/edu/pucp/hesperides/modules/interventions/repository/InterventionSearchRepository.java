package pe.edu.pucp.hesperides.modules.interventions.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.interventions.entity.Intervention;
import java.time.LocalDate;
import java.util.Map;

/** Static parameterized projection; Spring Data owns pagination and count. */
public interface InterventionSearchRepository extends Repository<Intervention,Long> {
    String FILTERS = """
        where i.deleted_at is null
          and (:role in ('ADMIN','COORDINADOR')
            or (:role='OPERARIO' and i.assigned_to_user_id=:actor)
            or (:role='SUPERVISOR' and exists(select 1 from teams t where t.id=i.team_id
                and t.supervisor_user_id=:actor and t.is_active and t.deleted_at is null)))
          and (cast(:classId as bigint) is null or i.intervention_class_item_id=:classId)
          and (cast(:typeId as bigint) is null or i.intervention_type_item_id=:typeId)
          and (cast(:team as bigint) is null or i.team_id=:team)
          and (cast(:assignee as bigint) is null or i.assigned_to_user_id=:assignee)
          and (cast(:status as varchar) is null or a.status_code=:status)
          and (cast(:dateFrom as date) is null or i.scheduled_date>=:dateFrom)
          and (cast(:dateTo as date) is null or i.scheduled_date<=:dateTo)
          and exists(select 1 from intervention_locations l join catalog_items ls on ls.id=l.status_item_id
            where l.intervention_id=i.id and l.deleted_at is null
              and (cast(:zone as bigint) is null or l.zone_id=:zone)
              and (cast(:place as bigint) is null or l.place_id=:place)
              and (cast(:localStatus as varchar) is null or ls.code=:localStatus)
              and (cast(:element as bigint) is null or exists(select 1 from intervention_elements e
                where e.intervention_location_id=l.id and e.green_element_id=:element and e.deleted_at is null)))
        """;
    @Query(value=InterventionQueriesRepository.SELECT+InterventionQueriesRepository.FROM+FILTERS,
        countQuery="select count(*) "+InterventionQueriesRepository.FROM+FILTERS,nativeQuery=true)
    Page<Map<String,Object>> search(@Param("actor") Long actor,@Param("role") String role,
        @Param("classId") Long classId,@Param("typeId") Long typeId,@Param("team") Long team,
        @Param("assignee") Long assignee,@Param("status") String status,@Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,@Param("zone") Long zone,@Param("place") Long place,
        @Param("localStatus") String localStatus,@Param("element") Long element,Pageable pageable);
}
