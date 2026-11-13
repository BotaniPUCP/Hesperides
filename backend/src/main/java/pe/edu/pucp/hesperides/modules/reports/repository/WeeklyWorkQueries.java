package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.interventions.repository.FinalApprovalSql;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * The approved work of a sector in a week (SPEC-202 §3.3, §3.6 "Semanal").
 * A work belongs to the sector when one of its locations lies in one of its
 * sections (D-03); its date is the last execution among all its locations (D-02),
 * the same rule as the monthly count. Only the sector's locations are returned.
 */
@Repository
@RequiredArgsConstructor
public class WeeklyWorkQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** One location in the sector of an approved work. {@code placeId} null means the location names a zone. */
    public record WorkLocationRow(Long workId, String code, String classLabel, Long typeItemId, String typeLabel,
                                  LocalDate workDate, LocalDate approvedOn,
                                  Long zoneId, String zoneName, Long placeId, String placeName) {
    }

    public record TeamRef(Long id, String name, String supervisorName) {
    }

    /** Newest work first; each work repeats once per location it has in {@code sectionIds}. */
    public List<WorkLocationRow> approvedLocations(ReportFilter f, Collection<Long> sectionIds) {
        var params = ReportSql.periodParams(f).addValue("sections", ReportSql.ids(sectionIds));
        String sql = "with works as (select i.id, " + ReportSql.civilDateOfUtc("max(l.completed_at)") + " work_date, "
                + ReportSql.civilDateOfUtc("max(l.validated_at)") + " approved_on"
                + " from interventions i join intervention_locations l on l.intervention_id=i.id and l.deleted_at is null"
                + " where " + FinalApprovalSql.PREDICATE + ReportSql.workFilters(f, params)
                + " group by i.id)"
                + " select w.id, i.code, c.label class_label, t.id type_id, t.label type_label, w.work_date, w.approved_on,"
                + " l.zone_id, l_z.name zone_name, l.place_id, l_p.name place_name"
                + " from works w join interventions i on i.id=w.id"
                + " join catalog_items c on c.id=i.intervention_class_item_id"
                + " left join catalog_items t on t.id=i.intervention_type_item_id"
                + " join intervention_locations l on l.intervention_id=i.id and l.deleted_at is null "
                + ReportSql.sectionJoins("l")
                + " where w.work_date between :from and :to and " + ReportSql.sectionOf("l") + " in (:sections)"
                + " order by w.work_date desc, i.id desc, l.id";
        return jdbc.query(sql, params, (rs, n) -> new WorkLocationRow(
                rs.getLong("id"), rs.getString("code"), rs.getString("class_label"),
                rs.getObject("type_id", Long.class), rs.getString("type_label"),
                rs.getObject("work_date", LocalDate.class), rs.getObject("approved_on", LocalDate.class),
                rs.getObject("zone_id", Long.class), rs.getString("zone_name"),
                rs.getObject("place_id", Long.class), rs.getString("place_name")));
    }

    /**
     * Evidence announced and not uploaded, of any date, of the works in the
     * reader's scope with a location in the sector (§3.6: a pending task, not a
     * figure of the week).
     */
    public long pendingPhotos(ReportFilter f, Collection<Long> sectionIds) {
        var params = new MapSqlParameterSource("sections", ReportSql.ids(sectionIds));
        String sql = "select count(*) from intervention_evidences e"
                + " join interventions i on i.id=e.intervention_id and i.deleted_at is null"
                + " where e.uploaded_at is null and e.deleted_at is null" + ReportSql.workFilters(f, params)
                + " and exists(select 1 from intervention_locations tl " + ReportSql.sectionJoins("tl")
                + " where tl.intervention_id=i.id and tl.deleted_at is null and "
                + ReportSql.sectionOf("tl") + " in (:sections))";
        Long count = jdbc.queryForObject(sql, params, Long.class);
        return count == null ? 0 : count;
    }

    /** Active teams whose sector is {@code sectorId}; for a SUPERVISOR only the ones they lead (D-08). */
    public List<TeamRef> teamsOfSector(Long sectorId, ReportFilter f) {
        var params = new MapSqlParameterSource("sectorId", sectorId);
        StringBuilder sql = new StringBuilder("""
            select t.id, t.name, nullif(trim(concat_ws(' ', u.first_name, u.last_name)), '') supervisor_name
            from teams t left join users u on u.id=t.supervisor_user_id
            where t.zone_id=:sectorId and t.is_active and t.deleted_at is null
            """);
        if (!f.campus()) {
            sql.append(" and t.id in (:scopeTeams)");
            params.addValue("scopeTeams", ReportSql.ids(f.scopeTeamIds()));
        }
        sql.append(" order by t.name");
        return jdbc.query(sql.toString(), params,
                (rs, n) -> new TeamRef(rs.getLong("id"), rs.getString("name"), rs.getString("supervisor_name")));
    }
}
