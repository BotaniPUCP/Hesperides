package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * The incidents of a sector at the weekly cutoff (SPEC-202 D-06, §3.6). The
 * status is rebuilt at the cutoff from the history; an incident registered
 * after it does not exist yet. A row belongs to a sector, in this order:
 * <ol>
 *   <li>its coordinates fall inside a section of the sector ({@code ST_Covers});</li>
 *   <li>otherwise, its assigned team has that sector ({@code teams.zone_id}).</li>
 * </ol>
 * Rows that match neither are "not locatable" and only counted apart.
 */
@Repository
@RequiredArgsConstructor
public class WeeklyIncidentQueries {

    public static final String BY_COORDINATES = "COORDINATES";
    public static final String BY_TEAM = "TEAM";

    private final NamedParameterJdbcTemplate jdbc;

    /** {@code sectorId} null means the incident could not be located in any sector. */
    public record IncidentRow(Long id, String description, String locationReference,
                              String urgencyCode, String urgencyLabel, String statusCode, String statusLabel,
                              String teamName, LocalDate reportedOn, Long sectorId, String locatedBy) {
    }

    private static final String SECTOR_BY_COORDINATES = """
        (select s.parent_zone_id from zones s
         join catalog_items st on st.id=s.zone_type_item_id and st.code='SECTION'
         where i.latitude is not null and s.boundary is not null and s.parent_zone_id is not null
           and s.is_active and s.deleted_at is null
           and ST_Covers(s.boundary, ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326))
         order by s.id limit 1)
        """;

    /**
     * Pending approval, open and in progress at the cutoff, inside the reader's
     * scope, located in {@code sectorId} or not locatable at all. Highest
     * urgency first, then the oldest.
     */
    public List<IncidentRow> openAtCutoff(ReportFilter f, Long sectorId, LocalDate cutoff) {
        var params = ReportSql.periodParams(f).addValue("sectorId", sectorId)
                .addValue("cutoffEnd", IncidentReportQueries.endOf(cutoff, f));
        String sql = "with scoped as (select i.id, i.description, i.location_reference, i.created_at,"
                + " u.code urgency_code, u.label urgency_label, u.sort_order urgency_order, tm.name team_name,"
                + IncidentReportQueries.STATUS_AT_CUTOFF + " status_code,"
                + SECTOR_BY_COORDINATES + " coord_sector, tm.zone_id team_sector"
                + " from incidents i join catalog_items cs on cs.id=i.status_item_id"
                + " left join catalog_items u on u.id=i.urgency_item_id"
                + " left join teams tm on tm.id=i.team_id"
                + " where i.deleted_at is null and i.created_at < :cutoffEnd"
                + IncidentReportQueries.scopeFilters(f, params) + "),"
                + " located as (select sc.*, coalesce(sc.coord_sector, sc.team_sector) sector_id,"
                + " case when sc.coord_sector is not null then '" + BY_COORDINATES + "'"
                + " when sc.team_sector is not null then '" + BY_TEAM + "' end located_by"
                + " from scoped sc where sc.status_code in ('PENDING_APPROVAL','OPEN','IN_PROGRESS'))"
                + " select l.*, (l.created_at at time zone :tz)::date reported_on,"
                + " (select x.label from catalog_items x join catalog_types xt on xt.id=x.catalog_type_id"
                + "  and xt.code='INCIDENT_STATUS' where x.code=l.status_code) status_label"
                + " from located l where l.sector_id=:sectorId or l.sector_id is null"
                + " order by l.urgency_order desc nulls last, l.created_at, l.id";
        return jdbc.query(sql, params, (rs, n) -> new IncidentRow(
                rs.getLong("id"), rs.getString("description"), rs.getString("location_reference"),
                rs.getString("urgency_code"), rs.getString("urgency_label"),
                rs.getString("status_code"), rs.getString("status_label"), rs.getString("team_name"),
                rs.getObject("reported_on", LocalDate.class), rs.getObject("sector_id", Long.class),
                rs.getString("located_by")));
    }
}
