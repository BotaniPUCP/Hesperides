package pe.edu.pucp.hesperides.modules.reports.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

import java.util.Collection;
import java.util.List;

/**
 * SQL fragments shared by the report queries. Each one is a fixed string: the
 * filters only choose which fragments to append, and every value travels as a
 * named parameter (INV-7).
 */
final class ReportSql {

    /** Never matches a real id: keeps {@code in (:ids)} valid when the list is empty. */
    static final long NO_ID = -1L;

    private ReportSql() {
    }

    /**
     * The section of a location (SPEC-202 D-03): its own zone or, if null, its
     * place's zone; a subsection counts for its parent section. Any other zone
     * (a sector) or none leaves the location without a section.
     * {@code %1$s} is the location alias.
     */
    static String sectionJoins(String location) {
        return """
            left join places %1$s_p on %1$s_p.id=%1$s.place_id and %1$s_p.deleted_at is null
            left join zones %1$s_z on %1$s_z.id=coalesce(%1$s.zone_id,%1$s_p.zone_id) and %1$s_z.deleted_at is null
            left join catalog_items %1$s_zt on %1$s_zt.id=%1$s_z.zone_type_item_id
            """.formatted(location);
    }

    static String sectionOf(String location) {
        return "(case %1$s_zt.code when 'SECTION' then %1$s_z.id when 'SUBSECTION' then %1$s_z.parent_zone_id end)"
                .formatted(location);
    }

    /** Civil date of a UTC wall-clock {@code timestamp} column in the configured zone. */
    static String civilDateOfUtc(String column) {
        return "((" + column + " at time zone 'UTC') at time zone :tz)::date";
    }

    /** Filters on the work itself: catalog, team and the SUPERVISOR's teams. Expects alias {@code i}. */
    static String workFilters(ReportFilter f, MapSqlParameterSource params) {
        StringBuilder sql = new StringBuilder();
        if (f.classItemId() != null) {
            sql.append(" and i.intervention_class_item_id=:classItemId");
            params.addValue("classItemId", f.classItemId());
        }
        if (f.typeItemId() != null) {
            sql.append(" and i.intervention_type_item_id=:typeItemId");
            params.addValue("typeItemId", f.typeItemId());
        }
        if (f.teamId() != null) {
            sql.append(" and i.team_id=:teamId");
            params.addValue("teamId", f.teamId());
        }
        if (!f.campus()) {
            sql.append(" and i.team_id in (:scopeTeams)");
            params.addValue("scopeTeams", ids(f.scopeTeamIds()));
        }
        return sql.toString();
    }

    static List<Long> ids(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? List.of(NO_ID) : List.copyOf(ids);
    }

    static MapSqlParameterSource periodParams(ReportFilter f) {
        return new MapSqlParameterSource()
                .addValue("tz", f.zone().getId())
                .addValue("from", f.period().from())
                .addValue("to", f.period().to());
    }
}
