package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** SPEC-201 §3.5 y §3.8; aceptación 5, 6 y 7. */
@SpringBootTest @Testcontainers @Transactional
class IncidentLinksAndClosureIntegrationTest extends IncidentTestSupport {

    private static final String SUMMARY = "Se podó la rama y se liberó el paso";

    @Test
    void linkingTheFirstInterventionPutsTheIncidentInProgress() {
        long id = activeIncident().incident().id();

        var linked = link(id, planWork());

        assertThat(linked.incident().status().code()).isEqualTo("IN_PROGRESS");
        assertThat(linked.linkedInterventions()).hasSize(1);
    }

    @Test
    void anInactiveIncidentCannotBeLinked() {
        var sent = reportAs(foreman);
        long work = planWork();
        assertThatThrownBy(() -> links.link(sent.incident().id(), new LinkRequest(sent.incident().version(), work), coordinator))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void onlyCoordinationLinks() {
        var active = activeIncident();
        long work = planWork();
        assertThatThrownBy(() -> links.link(active.incident().id(), new LinkRequest(active.incident().version(), work), foreman))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void creatingAnInterventionWithIncidentsLinksThemAndBothSidesSeeTheSameLink() {
        long id = activeIncident().incident().id();
        long work = planWorkFor(List.of(id));

        assertThat(current(id).linkedInterventions()).extracting(LinkedInterventionResponse::id).containsExactly(work);
        var fromWork = asActor(coordinator, () -> workService.findById(work)).getSourceIncidents();
        assertThat(fromWork).hasSize(1);
        assertThat(((Map<?, ?>) fromWork.getFirst()).get("id")).isEqualTo(id);
        assertThat(current(id).incident().status().code()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void removingTheLastLinkNeedsAReasonAndReturnsTheIncidentToReported() {
        long id = activeIncident().incident().id();
        var linked = link(id, planWork());
        long linkId = linked.linkedInterventions().getFirst().linkId();

        var unlinked = links.unlink(id, linkId, new ReasonRequest(linked.incident().version(), "Elegí la equivocada"), coordinator);

        assertThat(unlinked.linkedInterventions()).isEmpty();
        assertThat(unlinked.incident().status().code()).isEqualTo("REPORTED");
        assertThat(unlinked.updates()).extracting(u -> u.kind().code()).contains("INTERVENTION_UNLINKED");
    }

    @Test
    void completedButNotValidatedWorkBlocksTheClosure() {
        long id = activeIncident().incident().id();
        long work = planWork();
        link(id, work);
        finishWork(work);

        var detail = current(id);
        assertThat(detail.closureBlockers()).containsExactly("WORK_NOT_VALIDATED");
        assertThatThrownBy(() -> closure.close(id, new CloseRequest(detail.incident().version(), SUMMARY), coordinator))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void withAllWorkValidatedCoordinationClosesWithTheAppliedSolution() {
        long id = activeIncident().incident().id();
        long work = planWork();
        link(id, work);
        finishWork(work);
        validateWork(work);

        assertThatThrownBy(() -> closure.close(id, new CloseRequest(current(id).incident().version(), SUMMARY), foreman))
                .isInstanceOf(AccessDeniedException.class);
        var closed = closure.close(id, new CloseRequest(current(id).incident().version(), SUMMARY), coordinator).incident();

        assertThat(closed.status().code()).isEqualTo("CLOSED");
        assertThat(closed.resolutionSummary()).isEqualTo(SUMMARY);
        assertThat(closed.deadline().met()).isTrue();
        assertThat(closure.close(id, new CloseRequest(closed.version(), SUMMARY), coordinator).incident().closedAt())
                .isEqualTo(closed.closedAt());
        assertThatThrownBy(() -> closure.close(id, new CloseRequest(closed.version(), "Otro texto"), coordinator))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aCancelledInterventionBlocksUntilItIsReplaced() {
        long id = activeIncident().incident().id();
        long cancelled = planWork();
        var linked = link(id, cancelled);
        cancelWork(cancelled);
        assertThat(current(id).closureBlockers()).containsExactly("CANCELLED_WORK");

        long replacement = planWork();
        var replaced = links.replace(id, linked.linkedInterventions().getFirst().linkId(),
                new ReplaceRequest(current(id).incident().version(), replacement, "Pasa al tercero"), coordinator);

        assertThat(replaced.linkedInterventions()).extracting(LinkedInterventionResponse::id).containsExactly(replacement);
        assertThat(replaced.incident().status().code()).isEqualTo("IN_PROGRESS");
        assertThat(replaced.updates()).extracting(u -> u.kind().code()).contains("INTERVENTION_REPLACED");
        assertThat(replaced.closureBlockers()).containsExactly("WORK_NOT_VALIDATED");
    }

    @Test
    void sharedWorkIsValidatedOnceAndEachIncidentClosesOnItsOwn() {
        long first = activeIncident().incident().id();
        long second = activeIncident().incident().id();
        long work = planWorkFor(List.of(first, second));
        finishWork(work);
        validateWork(work);

        closure.close(first, new CloseRequest(current(first).incident().version(), SUMMARY), coordinator);

        assertThat(current(first).incident().status().code()).isEqualTo("CLOSED");
        assertThat(current(second).incident().status().code()).isEqualTo("IN_PROGRESS");
        assertThat(current(second).closureBlockers()).isEmpty();
    }

    @Test
    void coordinationFindsInterventionsToLinkByCodeExcludingCancelledOnes() {
        long work = planWork();
        long cancelled = planWork();
        cancelWork(cancelled);
        String code = asActor(coordinator, () -> workService.findById(work)).getCode();

        assertThat(links.candidates(code, coordinator)).extracting(LinkedInterventionResponse::id).containsExactly(work);
        String cancelledCode = asActor(coordinator, () -> workService.findById(cancelled)).getCode();
        assertThat(links.candidates(cancelledCode, coordinator)).isEmpty();
        assertThatThrownBy(() -> links.candidates(code, foreman)).isInstanceOf(AccessDeniedException.class);
    }

    long planWorkFor(List<Long> incidentIds) {
        long type = jdbc.queryForObject("""
            SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INTERVENTION_TYPE' AND ci.parent_item_id IS NOT NULL AND ci.is_active LIMIT 1
            """, Long.class);
        long group = jdbc.queryForObject("SELECT parent_item_id FROM catalog_items WHERE id=?", Long.class, type);
        var point = new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Point(-12.07, -77.08);
        var location = new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Location(null,
                java.util.UUID.randomUUID(), null, null, point, List.of(), "Lugar comprobado", null, null, List.of());
        var request = new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Planning(group, type,
                java.time.LocalDate.now(CAMPUS_ZONE), "Poda compartida", null, null, null, null, List.of(location),
                null, null, null, incidentIds);
        return asActor(coordinator, () -> workService.create(request, java.util.UUID.randomUUID()).intervention()).getId();
    }
}
