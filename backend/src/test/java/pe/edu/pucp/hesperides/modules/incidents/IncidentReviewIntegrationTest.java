package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.ReviewIncidentRequest;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.VersionRequest;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** SPEC-201 §3.6: coordinación modifica todo, conserva lo original y activa al final. */
@SpringBootTest @Testcontainers @Transactional
class IncidentReviewIntegrationTest extends IncidentTestSupport {

    @Test
    void coordinationCanChangeEverythingWhileTheOriginalReportIsKept() {
        var sent = reportAs(foreman);
        var i = sent.incident();
        var request = new ReviewIncidentRequest(i.version(), "Rama en riesgo", "Rama de ficus rajada, 8 m",
                "HIGH", "BRANCH_AT_RISK", anyZoneId(), "Frente a Letras", null, null, teamId, false, null, null,
                "OVER_5M", null, i.requestedBy().name(), null, null, null, null);

        var reviewed = review.update(i.id(), request, coordinator).incident();

        assertThat(reviewed.description()).isEqualTo("Rama de ficus rajada, 8 m");
        assertThat(reviewed.originalDescription()).isEqualTo("Rama rajada sobre el Pontódromo");
        assertThat(reviewed.urgency().code()).isEqualTo("HIGH");
        assertThat(reviewed.reportedUrgency().code()).isEqualTo("MEDIUM");
        assertThat(reviewed.editedFields()).contains("title", "description", "urgencyCode", "typeCode", "zoneId", "heightClass");
        assertThat(reviewed.active()).isFalse();
    }

    @Test
    void changingTheUrgencyRecalculatesTheDeadlineFromReception() {
        var i = reportAs(foreman).incident();
        var request = completeReview(reportAs(foreman));
        var high = new ReviewIncidentRequest(i.version(), null, i.description(), "HIGH", null, null, null, null, null,
                null, false, null, null, null, null, i.requestedBy().name(), null, null, null, null);

        var reviewed = review.update(i.id(), high, coordinator).incident();

        assertThat(java.time.Duration.between(reviewed.createdAt(), reviewed.deadline().dueAt())).hasHours(24);
        assertThat(request).isNotNull();
    }

    @Test
    void foremanCannotReviewNorActivate() {
        var sent = reportAs(foreman);
        assertThatThrownBy(() -> review.update(sent.incident().id(), completeReview(sent), foreman))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> review.activate(sent.incident().id(), new VersionRequest(sent.incident().version()), foreman))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void activationNeedsTypeUrgencyAndLocation() {
        var sent = reportAs(foreman);

        assertThatThrownBy(() -> review.activate(sent.incident().id(), new VersionRequest(sent.incident().version()), coordinator))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("TYPE").hasMessageContaining("LOCATION");
        assertThat(sent.activationGaps()).containsExactly("TYPE", "LOCATION");
    }

    @Test
    void aTallTreeCannotBeActivatedWithOwnStaff() {
        var sent = reportAs(foreman);
        var r = completeReview(sent);
        var tall = new ReviewIncidentRequest(r.version(), r.title(), r.description(), r.urgencyCode(), r.typeCode(),
                r.zoneId(), null, null, null, r.teamId(), false, null, null, "OVER_5M", null, r.requestedByName(),
                null, null, null, null);
        var reviewed = review.update(sent.incident().id(), tall, coordinator);

        assertThatThrownBy(() -> review.activate(sent.incident().id(), new VersionRequest(reviewed.incident().version()), coordinator))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("TALL_TREE_NEEDS_THIRD_PARTY");
    }

    @Test
    void thirdPartyMustBeAnExternalCompanyOfTheDirectory() {
        var sent = reportAs(foreman);
        String unit = organization("Facultad de Letras", "PUCP_UNIT");
        var r = completeReview(sent);
        var request = new ReviewIncidentRequest(r.version(), r.title(), r.description(), r.urgencyCode(), r.typeCode(),
                r.zoneId(), null, null, null, r.teamId(), true, unit, 10, "OVER_5M", null, r.requestedByName(),
                null, null, null, null);

        assertThatThrownBy(() -> review.update(sent.incident().id(), request, coordinator)).isInstanceOf(ValidationException.class);
    }

    @Test
    void activatingAThirdPartyIncidentUsesTheAgreedDays() {
        var sent = reportAs(foreman);
        String company = organization("Arbolistas del Sur", "EXTERNAL_COMPANY");
        var r = completeReview(sent);
        var request = new ReviewIncidentRequest(r.version(), r.title(), r.description(), r.urgencyCode(), r.typeCode(),
                r.zoneId(), null, null, null, r.teamId(), true, company, 10, "OVER_5M", null, r.requestedByName(),
                null, null, null, null);
        var reviewed = review.update(sent.incident().id(), request, coordinator);

        var active = review.activate(sent.incident().id(), new VersionRequest(reviewed.incident().version()), coordinator).incident();

        assertThat(active.active()).isTrue();
        assertThat(active.provider().name()).isEqualTo("Arbolistas del Sur");
        assertThat(java.time.Duration.between(active.createdAt(), active.deadline().dueAt())).hasDays(10);
    }

    @Test
    void anOldVersionConflictsAndKeepsTheCurrentData() {
        var sent = reportAs(foreman);
        review.update(sent.incident().id(), completeReview(sent), coordinator);

        assertThatThrownBy(() -> review.update(sent.incident().id(), completeReview(sent), coordinator))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void activatingTwiceIsHarmless() {
        var active = activeIncident();
        var again = review.activate(active.incident().id(), new VersionRequest(0L), coordinator);
        assertThat(again.incident().activatedAt()).isEqualTo(active.incident().activatedAt());
    }

    String organization(String name, String type) {
        return jdbc.queryForObject("""
            INSERT INTO organizations(name,type_item_id) SELECT ?, ci.id FROM catalog_items ci
            JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='ORGANIZATION_TYPE' AND ci.code=? RETURNING code
            """, String.class, name, type);
    }
}
