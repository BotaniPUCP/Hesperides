package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Irrigation in the reports (SPEC-202 D-15, provisional rule): a section is
 * irrigated in a period when it appears in at least one turn <b>of its own
 * sector</b> dated inside the period. A section listed in another sector's turn
 * does not count. {@code irrigation_date} is already a civil date.
 */
@Repository
@RequiredArgsConstructor
public class IrrigationReportQueries {

    /** Turn sections whose section belongs to the turn's sector. Expects {@code :from}/{@code :to} or {@code :upTo}. */
    private static final String OWN_SECTOR_SECTIONS = """
        from irrigation_turn_sections ts
        join irrigation_turns t on t.id=ts.turn_id and t.deleted_at is null
        join zones s on s.id=ts.section_zone_id and s.parent_zone_id=t.sector_zone_id
        where ts.deleted_at is null
        """;

    private final NamedParameterJdbcTemplate jdbc;

    /** Turns registered for the sector in the period. */
    public long turns(Long sectorId, DateRange period) {
        Long count = jdbc.queryForObject("""
            select count(*) from irrigation_turns t
            where t.deleted_at is null and t.sector_zone_id=:sectorId and t.irrigation_date between :from and :to
            """, range(period).addValue("sectorId", sectorId), Long.class);
        return count == null ? 0 : count;
    }

    /** Sections irrigated in the period; with {@code sectorId} null, on the whole campus. */
    public Set<Long> irrigatedSections(Long sectorId, DateRange period) {
        var params = range(period);
        String sql = "select distinct ts.section_zone_id " + OWN_SECTOR_SECTIONS
                + " and t.irrigation_date between :from and :to" + sectorFilter(sectorId, params);
        return new HashSet<>(jdbc.queryForList(sql, params, Long.class));
    }

    /** Last irrigation of each section of the sector up to {@code upTo}, inclusive. */
    public Map<Long, LocalDate> lastIrrigated(Long sectorId, LocalDate upTo) {
        var params = new MapSqlParameterSource("upTo", upTo);
        String sql = "select ts.section_zone_id, max(t.irrigation_date) " + OWN_SECTOR_SECTIONS
                + " and t.irrigation_date <= :upTo" + sectorFilter(sectorId, params)
                + " group by ts.section_zone_id";
        Map<Long, LocalDate> last = new HashMap<>();
        jdbc.query(sql, params, rs -> {
            last.put(rs.getLong(1), rs.getObject(2, LocalDate.class));
        });
        return last;
    }

    private static String sectorFilter(Long sectorId, MapSqlParameterSource params) {
        if (sectorId == null) {
            return "";
        }
        params.addValue("sectorId", sectorId);
        return " and t.sector_zone_id=:sectorId";
    }

    private static MapSqlParameterSource range(DateRange period) {
        return new MapSqlParameterSource().addValue("from", period.from()).addValue("to", period.to());
    }
}
