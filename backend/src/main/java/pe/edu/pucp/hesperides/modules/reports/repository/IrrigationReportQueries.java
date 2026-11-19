package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Irrigation in the reports (SPEC-202 D-15, provisional rule): a section is
 * irrigated on the civil day an intervention of class {@code RIEGO} completed a
 * location there. Same reading as a garden's last time in planning (SPEC-203
 * §5.4): the work is not cancelled and the location is COMPLETED or VALIDATED,
 * without waiting for the final approval. Irrigation turns no longer exist.
 */
@Repository
@RequiredArgsConstructor
public class IrrigationReportQueries {

    /** One row per irrigated location, with its section and civil day. Expects {@code :tz}. */
    private static final String IRRIGATED = "select i.id work_id, " + ReportSql.sectionOf("l") + " section_id, "
            + ReportSql.civilDateOfUtc("l.completed_at") + " irrigated_on"
            + " from interventions i"
            + " join catalog_items ic on ic.id=i.intervention_class_item_id and ic.code='RIEGO'"
            + " join catalog_items ip on ip.id=i.planning_status_item_id and ip.code<>'CANCELLED'"
            + " join intervention_locations l on l.intervention_id=i.id and l.deleted_at is null"
            + " join catalog_items ls on ls.id=l.status_item_id and ls.code in ('COMPLETED','VALIDATED') "
            + ReportSql.sectionJoins("l")
            + " where i.deleted_at is null and l.completed_at is not null";

    private final NamedParameterJdbcTemplate jdbc;

    /** Irrigation works that reached a section of the sector in the period. */
    public long irrigations(Long sectorId, DateRange period, ZoneId zone) {
        var params = range(period, zone);
        Long count = jdbc.queryForObject("select count(distinct r.work_id) " + fromRows(sectorId, params)
                + " and r.irrigated_on between :from and :to", params, Long.class);
        return count == null ? 0 : count;
    }

    /** Sections irrigated in the period; with {@code sectorId} null, on the whole campus. */
    public Set<Long> irrigatedSections(Long sectorId, DateRange period, ZoneId zone) {
        var params = range(period, zone);
        String sql = "select distinct r.section_id " + fromRows(sectorId, params) + " and r.irrigated_on between :from and :to";
        return new HashSet<>(jdbc.queryForList(sql, params, Long.class));
    }

    /** Last irrigation of each section of the sector up to {@code upTo}, inclusive. */
    public Map<Long, LocalDate> lastIrrigated(Long sectorId, LocalDate upTo, ZoneId zone) {
        var params = new MapSqlParameterSource("upTo", upTo).addValue("tz", zone.getId());
        String sql = "select r.section_id, max(r.irrigated_on) " + fromRows(sectorId, params)
                + " and r.irrigated_on <= :upTo group by r.section_id";
        Map<Long, LocalDate> last = new HashMap<>();
        jdbc.query(sql, params, rs -> {
            last.put(rs.getLong(1), rs.getObject(2, LocalDate.class));
        });
        return last;
    }

    private static String fromRows(Long sectorId, MapSqlParameterSource params) {
        String from = "from (" + IRRIGATED + ") r join zones s on s.id=r.section_id where true";
        if (sectorId == null) {
            return from;
        }
        params.addValue("sectorId", sectorId);
        return from + " and s.parent_zone_id=:sectorId";
    }

    private static MapSqlParameterSource range(DateRange period, ZoneId zone) {
        return new MapSqlParameterSource().addValue("from", period.from()).addValue("to", period.to())
                .addValue("tz", zone.getId());
    }
}
