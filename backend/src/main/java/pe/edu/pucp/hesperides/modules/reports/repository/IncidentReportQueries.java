package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.reporting.DateRange;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Incidents in the reports (SPEC-202 D-06). V026 does not tie an incident to a
 * section, so the monthly report only filters them by team (§3.6).
 */
@Repository
@RequiredArgsConstructor
public class IncidentReportQueries {

    private final NamedParameterJdbcTemplate jdbc;

    public record MonthlyCounters(long pendingApproval, long open, long inProgress,
                                  long reportedInPeriod, long resolvedInPeriod) {
    }

    /**
     * Status of an incident at the end of the cutoff date, rebuilt from its
     * history. An incident without any history row keeps its current status.
     */
    static final String STATUS_AT_CUTOFF = """
        coalesce(
            (select hs.code from incident_status_history h join catalog_items hs on hs.id=h.status_item_id
             where h.incident_id=i.id and h.deleted_at is null and h.created_at < :cutoffEnd
             order by h.created_at desc, h.id desc limit 1),
            case when not exists(select 1 from incident_status_history h0
                                 where h0.incident_id=i.id and h0.deleted_at is null)
                 then cs.code end)
        """;

    /**
     * Counts by status at the cutoff, plus the incidents registered and resolved
     * in the period. Incidents registered after the cutoff do not exist yet.
     */
    public MonthlyCounters monthlyCounters(ReportFilter f, LocalDate cutoff) {
        var params = ReportSql.periodParams(f).addValue("cutoffEnd", endOf(cutoff, f));
        String sql = "with scoped as (select i.created_at, i.resolved_at, " + STATUS_AT_CUTOFF + " status_code"
                + " from incidents i join catalog_items cs on cs.id=i.status_item_id"
                + " where i.deleted_at is null and i.created_at < :cutoffEnd" + scopeFilters(f, params) + ")"
                + " select count(*) filter (where status_code='PENDING_APPROVAL') pending_approval,"
                + " count(*) filter (where status_code='OPEN') open_count,"
                + " count(*) filter (where status_code='IN_PROGRESS') in_progress,"
                + " count(*) filter (where (created_at at time zone :tz)::date between :from and :to) reported,"
                + " count(*) filter (where (resolved_at at time zone :tz)::date between :from and :to) resolved"
                + " from scoped";
        return jdbc.queryForObject(sql, params, (rs, n) -> new MonthlyCounters(
                rs.getLong("pending_approval"), rs.getLong("open_count"), rs.getLong("in_progress"),
                rs.getLong("reported"), rs.getLong("resolved")));
    }

    /** Incidents of the whole campus resolved in the period, by civil date (§2.6 row 23). */
    public long resolvedIn(DateRange period, ZoneId zone) {
        Long count = jdbc.queryForObject("""
            select count(*) from incidents i
            where i.deleted_at is null and i.resolved_at is not null
              and (i.resolved_at at time zone :tz)::date between :from and :to
            """, new MapSqlParameterSource().addValue("tz", zone.getId())
                .addValue("from", period.from()).addValue("to", period.to()), Long.class);
        return count == null ? 0 : count;
    }

    /** What SPEC-201 lets a SUPERVISOR see: sent by them or assigned to the teams they lead. */
    static String scopeFilters(ReportFilter f, MapSqlParameterSource params) {
        StringBuilder sql = new StringBuilder();
        if (!f.campus()) {
            sql.append(" and (i.reported_by_user_id=:userId or i.team_id in (:scopeTeams))");
            params.addValue("userId", f.userId()).addValue("scopeTeams", ReportSql.ids(f.scopeTeamIds()));
        }
        if (f.teamId() != null) {
            sql.append(" and i.team_id=:teamId");
            params.addValue("teamId", f.teamId());
        }
        return sql.toString();
    }

    /** The first instant after the cutoff date in the configured zone. */
    static OffsetDateTime endOf(LocalDate cutoff, ReportFilter f) {
        return cutoff.plusDays(1).atStartOfDay(f.zone()).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }
}
