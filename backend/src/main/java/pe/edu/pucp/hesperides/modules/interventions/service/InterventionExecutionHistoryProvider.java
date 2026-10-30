package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.maintenance.service.ExecutionHistoryProvider;
import pe.edu.pucp.hesperides.modules.maintenance.service.LocationExecution;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import java.time.*;
import java.util.List;
import java.util.Map;

/** Reads accepted work without changing the intervention or frequency aggregates. */
@Component
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class InterventionExecutionHistoryProvider implements ExecutionHistoryProvider {
    private final NamedParameterJdbcTemplate jdbc;
    private final UsersRepository users;
    @Value("${hesperides.maintenance.time-zone:America/Lima}")
    private String timeZone;

    @Override public boolean supportsLocationHistory() { return true; }

    /** No calendar-only projection can claim campus-wide coverage of local work. */
    @Override public List<LocalDate> executionDates(Long activity, String regime, LocalDate from, LocalDate to) {
        return List.of();
    }

    @Override public List<LocationExecution> locationExecutions(Long activity, String regime, LocalDate from, LocalDate to) {
        if (!"IN_HOUSE".equals(regime)) return List.of();
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) throw new UnauthorizedException("Authentication required");
        var actor = users.findActiveByEmail(authentication.getName()).orElseThrow(() -> new UnauthorizedException("Account unavailable"));
        if (!actor.isActive() || !actor.getRoleItem().isActive() || actor.getRoleItem().isDeleted()) throw new UnauthorizedException("Account unavailable");
        var zone = ZoneId.of(timeZone);
        var facts = jdbc.query("""
            select i.id work_id,i.code,l.id location_id,l.attempt_number,l.zone_id,l.place_id,
                   l.completed_at,l.validated_at,a.approved_at,
                   coalesce(p.name,z.name,l.location_description,i.code) target_label
            from interventions i join catalog_items ps on ps.id=i.planning_status_item_id
            join intervention_locations l on l.intervention_id=i.id and l.deleted_at is null
            left join places p on p.id=l.place_id left join zones z on z.id=l.zone_id
            cross join lateral (select max(al.validated_at) approved_at
                from intervention_locations al where al.intervention_id=i.id and al.deleted_at is null) a
            where i.deleted_at is null and ps.code='ASSIGNED' and i.intervention_type_item_id=:activity
              and l.completed_at is not null and l.validated_at is not null
              and not exists(select 1 from intervention_locations al join catalog_items s on s.id=al.status_item_id
                  where al.intervention_id=i.id and al.deleted_at is null
                    and (s.code<>'VALIDATED' or al.completed_at is null or al.validated_at is null))
              and (:role in ('ADMIN','COORDINADOR')
                or (:role='OPERARIO' and i.assigned_to_user_id=:actor)
                or (:role='SUPERVISOR' and exists(select 1 from teams t where t.id=i.team_id
                    and t.supervisor_user_id=:actor and t.is_active and t.deleted_at is null)))
            order by l.completed_at,i.id,l.id
            """,Map.of("activity",activity,"role",actor.getRoleCode(),"actor",actor.getId()),(r,n) -> {
                Long place = r.getObject("place_id",Long.class), section = r.getObject("zone_id",Long.class);
                long location = r.getLong("location_id");
                Instant completed = r.getObject("completed_at",LocalDateTime.class).toInstant(ZoneOffset.UTC);
                Instant validated = r.getObject("validated_at",LocalDateTime.class).toInstant(ZoneOffset.UTC);
                Instant approved = r.getObject("approved_at",LocalDateTime.class).toInstant(ZoneOffset.UTC);
                return new LocationExecution(r.getLong("work_id"),r.getString("code"),location,r.getInt("attempt_number"),
                        place!=null?"PLACE":section!=null?"ZONE":"LOCATION",place!=null?place:section!=null?section:location,
                        r.getString("target_label"),section,place,completed,validated,approved,
                        completed.atZone(zone).toLocalDate(),approved.atZone(zone).toLocalDate());
            });
        // Apply the period boundary after collecting all pieces of a work in
        // the same target; otherwise its earlier pieces could count prematurely.
        var lastByWorkTarget = new java.util.HashMap<String,LocalDate>();
        for (var fact : facts) lastByWorkTarget.merge(key(fact),fact.executionDate(),(a,b)->a.isAfter(b)?a:b);
        return facts.stream().filter(fact -> !lastByWorkTarget.get(key(fact)).isAfter(to)).toList();
    }
    private String key(LocationExecution fact) {
        return fact.interventionId()+":"+fact.targetKind()+":"+fact.targetId();
    }
}
