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
 * The works behind a report figure (SPEC-202 D-20). Each method selects its
 * works with the very fragment that computes the figure, and only adds the
 * columns a row needs, so the list and the count never disagree.
 */
@Repository
@RequiredArgsConstructor
public class InterventionListQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** {@code lastExecutionDate} is null for a work not executed yet; {@code pendingPhotos} counts its unsent evidence. */
    public record WorkRow(Long id, String code, String classLabel, String typeLabel, String teamName,
                          LocalDate lastExecutionDate, long pendingPhotos) {
    }

    /** The works that {@link InterventionReportQueries#approvedCount} counts. */
    public List<WorkRow> approved(ReportFilter f, Collection<Long> sectionIds) {
        return byWorkDate(FinalApprovalSql.PREDICATE, f, sectionIds);
    }

    /** The works that {@link InterventionReportQueries#pendingApprovalCount} counts. */
    public List<WorkRow> pendingApproval(ReportFilter f, Collection<Long> sectionIds) {
        return byWorkDate(InterventionReportQueries.PENDING_APPROVAL, f, sectionIds);
    }

    /** The works whose attendance makes {@code sectionId} covered in the period: its {@code approvedInterventions}. */
    public List<WorkRow> attendedSection(ReportFilter f, Long sectionId) {
        var params = ReportSql.periodParams(f).addValue("section", sectionId);
        String works = "select a.work_id id, a.attended_on work_date from ("
                + CoverageQueries.attendanceSql(f, params) + ") a"
                + " where a.section_id=:section and a.attended_on between :from and :to";
        return rows(works, params);
    }

    /** The works whose evidence {@link WeeklyWorkQueries#pendingPhotos} counts; their date is their last execution, if any. */
    public List<WorkRow> withPendingPhotos(ReportFilter f, Collection<Long> sectionIds) {
        var params = ReportSql.periodParams(f);
        String works = "select p.id, (select " + ReportSql.civilDateOfUtc("max(l.completed_at)")
                + " from intervention_locations l where l.intervention_id=p.id and l.deleted_at is null) work_date"
                + " from (select distinct i.id" + WeeklyWorkQueries.pendingPhotosFrom(f, sectionIds, params) + ") p";
        return rows(works, params);
    }

    private List<WorkRow> byWorkDate(String state, ReportFilter f, Collection<Long> sectionIds) {
        var params = ReportSql.periodParams(f);
        String works = "select d.id, d.work_date from ("
                + InterventionReportQueries.worksByDate(state, f, sectionIds, params) + ") d"
                + " where d.work_date between :from and :to";
        return rows(works, params);
    }

    /** {@code works} yields {@code id} and {@code work_date}; newest first, unexecuted last. */
    private List<WorkRow> rows(String works, MapSqlParameterSource params) {
        String sql = "select i.id, i.code, c.label class_label, t.label type_label, tm.name team_name, w.work_date,"
                + " (select count(*) from intervention_evidences pe where pe.intervention_id=i.id"
                + " and pe.uploaded_at is null and pe.deleted_at is null) pending_photos"
                + " from (" + works + ") w join interventions i on i.id=w.id"
                + " join catalog_items c on c.id=i.intervention_class_item_id"
                + " left join catalog_items t on t.id=i.intervention_type_item_id"
                + " left join teams tm on tm.id=i.team_id"
                + " order by w.work_date desc nulls last, i.id desc";
        return jdbc.query(sql, params, (rs, n) -> new WorkRow(
                rs.getLong("id"), rs.getString("code"), rs.getString("class_label"), rs.getString("type_label"),
                rs.getString("team_name"), rs.getObject("work_date", LocalDate.class), rs.getLong("pending_photos")));
    }
}
