package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.interventions.repository.FinalApprovalSql;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.ClassOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.TypeOption;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Intervention taxonomy and counts for the reports. Parameterized native SQL only. */
@Repository
@RequiredArgsConstructor
public class InterventionReportQueries {

    /**
     * Executed but not yet finally approved: planning ASSIGNED, every active
     * location executed and at least one still waiting for review. Informative
     * only; it never adds to coverage (SPEC-202 §2.6 row 3).
     */
    static final String PENDING_APPROVAL = """
        (i.deleted_at is null
        and exists(select 1 from catalog_items pa_ps
            where pa_ps.id=i.planning_status_item_id and pa_ps.code='ASSIGNED')
        and not exists(select 1 from intervention_locations pa_l join catalog_items pa_s on pa_s.id=pa_l.status_item_id
            where pa_l.intervention_id=i.id and pa_l.deleted_at is null
              and (pa_s.code not in ('COMPLETED','VALIDATED') or pa_l.completed_at is null))
        and exists(select 1 from intervention_locations pa_l join catalog_items pa_s on pa_s.id=pa_l.status_item_id
            where pa_l.intervention_id=i.id and pa_l.deleted_at is null and pa_s.code='COMPLETED'))
        """;

    private final NamedParameterJdbcTemplate jdbc;

    /** Catalog type and parent of a catalog item, to validate filters. */
    public record CatalogRef(Long id, String typeCode, Long parentId) {
    }

    public Optional<CatalogRef> catalogItem(Long id) {
        return jdbc.query("""
            select ci.id, ct.code, ci.parent_item_id from catalog_items ci
            join catalog_types ct on ct.id=ci.catalog_type_id
            where ci.id=:id and ci.deleted_at is null
            """, new MapSqlParameterSource("id", id),
            (rs, n) -> new CatalogRef(rs.getLong(1), rs.getString(2), rs.getObject(3, Long.class)))
            .stream().findFirst();
    }

    /** Works with final approval whose last execution falls in the period (D-02). */
    public long approvedCount(ReportFilter f, Collection<Long> sectionIds) {
        return countByWorkDate(FinalApprovalSql.PREDICATE, f, sectionIds);
    }

    public long pendingApprovalCount(ReportFilter f, Collection<Long> sectionIds) {
        return countByWorkDate(PENDING_APPROVAL, f, sectionIds);
    }

    /**
     * A work's date is the last execution among its locations. With a
     * territorial filter only works with a location in {@code sectionIds} count;
     * without one, a work located only by a point still counts (§5.3).
     */
    private long countByWorkDate(String state, ReportFilter f, Collection<Long> sectionIds) {
        var params = ReportSql.periodParams(f);
        StringBuilder sql = new StringBuilder("select count(*) from (select i.id, ")
                .append(ReportSql.civilDateOfUtc("max(l.completed_at)")).append(" work_date")
                .append(" from interventions i join intervention_locations l")
                .append(" on l.intervention_id=i.id and l.deleted_at is null where ").append(state)
                .append(ReportSql.workFilters(f, params));
        if (f.territorial()) {
            sql.append(" and exists(select 1 from intervention_locations tl ").append(ReportSql.sectionJoins("tl"))
                    .append(" where tl.intervention_id=i.id and tl.deleted_at is null and ")
                    .append(ReportSql.sectionOf("tl")).append(" in (:sections))");
            params.addValue("sections", ReportSql.ids(sectionIds));
        }
        sql.append(" group by i.id) w where w.work_date between :from and :to");
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0 : count;
    }

    /** Active classes with their active types (SPEC-200 §2.4). A type under an inactive class is not offered. */
    public List<ClassOption> activeClassesWithTypes() {
        var classes = new LinkedHashMap<Long, ClassOption>();
        jdbc.query("""
            select c.id, c.code, c.label, t.id type_id, t.code type_code, t.label type_label
            from catalog_items c
            join catalog_types ct on ct.id=c.catalog_type_id and ct.code='INTERVENTION_CLASS'
            left join catalog_items t on t.parent_item_id=c.id and t.is_active and t.deleted_at is null
                and t.catalog_type_id=(select id from catalog_types where code='INTERVENTION_TYPE')
            where c.is_active and c.deleted_at is null
            order by c.sort_order, c.label, t.sort_order, t.label
            """, Map.of(), rs -> {
            long classId = rs.getLong("id");
            String code = rs.getString("code");
            String label = rs.getString("label");
            ClassOption option = classes.computeIfAbsent(classId,
                    id -> new ClassOption(id, code, label, new ArrayList<>()));
            long typeId = rs.getLong("type_id");
            if (!rs.wasNull()) {
                option.types().add(new TypeOption(typeId, rs.getString("type_code"), rs.getString("type_label")));
            }
        });
        return List.copyOf(classes.values());
    }
}
