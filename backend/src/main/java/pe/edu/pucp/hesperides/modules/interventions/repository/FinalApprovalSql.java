package pe.edu.pucp.hesperides.modules.interventions.repository;

/**
 * The only definition of an intervention's final approval (SPEC-200 D-06): its
 * planning is ASSIGNED and every active location is VALIDATED with both the
 * physical completion and the approval recorded.
 *
 * <p>Every reader of accepted work embeds this fragment instead of restating it,
 * so the frequency history and the reports (SPEC-202 D-02) cannot drift apart.
 * The approval must exist when the query runs: it is evaluated retrospectively,
 * never as of the execution date.
 *
 * <p>Expects the intervention table aliased as {@code i}. Its own aliases use the
 * {@code fa_} prefix so they never collide with the enclosing query. The fragment
 * is parenthesized: it composes after {@code and} without depending on the
 * whitespace that a text block strips before its closing delimiter.
 */
public final class FinalApprovalSql {

    public static final String PREDICATE = """
        (i.deleted_at is null
        and exists(select 1 from catalog_items fa_ps
            where fa_ps.id=i.planning_status_item_id and fa_ps.code='ASSIGNED')
        and exists(select 1 from intervention_locations fa_l
            where fa_l.intervention_id=i.id and fa_l.deleted_at is null)
        and not exists(select 1 from intervention_locations fa_l
            join catalog_items fa_s on fa_s.id=fa_l.status_item_id
            where fa_l.intervention_id=i.id and fa_l.deleted_at is null
              and (fa_s.code<>'VALIDATED' or fa_l.completed_at is null or fa_l.validated_at is null)))
        """;

    private FinalApprovalSql() {
    }
}
