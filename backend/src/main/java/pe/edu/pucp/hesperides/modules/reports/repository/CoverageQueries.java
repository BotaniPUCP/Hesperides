package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.interventions.repository.FinalApprovalSql;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Coverage of sections by approved work (SPEC-202 D-01 to D-04). Two reads:
 * the denominator (which sections exist in the filter) and the attendance (which
 * work reached which section in the period). Joining them is done by the
 * caller, so each query stays readable and both are testable on their own.
 */
@Repository
@RequiredArgsConstructor
public class CoverageQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** A section of the denominator, with its current sector and area (D-12). */
    public record SectionRef(Long sectionId, String code, String name, BigDecimal areaM2,
                             Long sectorId, String sectorCode, String sectorName) {
    }

    /** A work that reached a section; {@code attendedOn} is its last execution there (D-02). */
    public record Attendance(Long sectionId, Long workId, LocalDate attendedOn) {
    }

    /** Type code and parent of an active zone, to validate filters. */
    public record ZoneRef(Long id, String typeCode, Long parentId) {
    }

    public Optional<ZoneRef> zone(Long id) {
        return jdbc.query("""
            select z.id, t.code, z.parent_zone_id from zones z
            join catalog_items t on t.id=z.zone_type_item_id
            where z.id=:id and z.is_active and z.deleted_at is null
            """, new MapSqlParameterSource("id", id),
            (rs, n) -> new ZoneRef(rs.getLong(1), rs.getString(2), rs.getObject(3, Long.class)))
            .stream().findFirst();
    }

    /**
     * Active sections in the filter (D-04). Same rule as a sector's sections in
     * irrigation; sections without a parent sector form the "no sector" row.
     */
    public List<SectionRef> denominator(ReportFilter f) {
        var params = new MapSqlParameterSource();
        StringBuilder sql = new StringBuilder("""
            select s.id, s.code, s.name, s.area_m2, sec.id sector_id, sec.code sector_code, sec.name sector_name
            from zones s
            join catalog_items st on st.id=s.zone_type_item_id and st.code='SECTION'
            join catalog_types stt on stt.id=st.catalog_type_id and stt.code='ZONE_TYPE'
            left join zones sec on sec.id=s.parent_zone_id and sec.is_active and sec.deleted_at is null
            where s.is_active and s.deleted_at is null
            """);
        if (f.sectionId() != null) {
            sql.append(" and s.id=:sectionId");
            params.addValue("sectionId", f.sectionId());
        }
        if (f.sectorId() != null) {
            sql.append(" and s.parent_zone_id=:sectorId");
            params.addValue("sectorId", f.sectorId());
        }
        if (!f.campus()) {
            sql.append(" and s.parent_zone_id in (:scopeSectors)");
            params.addValue("scopeSectors", ReportSql.ids(f.scopeSectorIds()));
        }
        sql.append(" order by s.id");
        return jdbc.query(sql.toString(), params, (rs, n) -> new SectionRef(
                rs.getLong("id"), rs.getString("code"), rs.getString("name"), rs.getBigDecimal("area_m2"),
                rs.getObject("sector_id", Long.class), rs.getString("sector_code"), rs.getString("sector_name")));
    }

    /**
     * Approved work per section in the period. The last execution of all the
     * work's pieces in a section decides the date, so earlier pieces never count
     * before the final one (D-02, T09).
     */
    public List<Attendance> attendance(ReportFilter f) {
        var params = ReportSql.periodParams(f);
        String lastDate = ReportSql.civilDateOfUtc("max(l.completed_at)");
        String sql = "with pieces as (select i.id work_id, " + ReportSql.sectionOf("l") + " section_id, l.completed_at"
                + " from interventions i join intervention_locations l on l.intervention_id=i.id and l.deleted_at is null "
                + ReportSql.sectionJoins("l")
                + " where " + FinalApprovalSql.PREDICATE + ReportSql.workFilters(f, params) + ")"
                + " select l.work_id, l.section_id, " + lastDate + " attended_on from pieces l"
                + " where l.section_id is not null group by l.work_id, l.section_id"
                + " having " + lastDate + " between :from and :to";
        return jdbc.query(sql, params, (rs, n) -> new Attendance(
                rs.getLong("section_id"), rs.getLong("work_id"), rs.getObject("attended_on", LocalDate.class)));
    }
}
