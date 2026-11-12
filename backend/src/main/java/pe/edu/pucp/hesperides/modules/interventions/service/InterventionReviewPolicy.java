package pe.edu.pucp.hesperides.modules.interventions.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.interventions.entity.InterventionLocation;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionEvidencesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/** Provisional operational defaults, isolated from persistence and state transitions. */
@Component
public class InterventionReviewPolicy {
    private final InterventionEvidencesRepository evidences;
    private final boolean requirePhotoOnCompletion;
    private final boolean blockPendingOnApproval;

    public InterventionReviewPolicy(InterventionEvidencesRepository evidences,
            @Value("${interventions.review.require-photo-on-completion:true}") boolean requirePhotoOnCompletion,
            @Value("${interventions.review.block-pending-on-approval:true}") boolean blockPendingOnApproval) {
        this.evidences = evidences;
        this.requirePhotoOnCompletion = requirePhotoOnCompletion;
        this.blockPendingOnApproval = blockPendingOnApproval;
    }

    public void check(InterventionLocation location, boolean approval) {
        var photos = evidences.findByInterventionIdAndDeletedAtIsNullOrderById(location.getInterventionId());
        var current = photos.stream().filter(e -> e.getInterventionLocationId().equals(location.getId())
                && e.getAttemptNumber() == location.getAttemptNumber()).toList();
        if ((approval || requirePhotoOnCompletion) && current.stream().noneMatch(e -> e.getUploadedAt() != null)) {
            throw new BusinessRuleException("At least one received photo is required for this location and attempt");
        }
        // Old pending announcements must not disappear when a correction opens a new attempt.
        if (approval && blockPendingOnApproval && photos.stream().anyMatch(e ->
                e.getInterventionLocationId().equals(location.getId()) && e.getUploadedAt() == null)) {
            throw new BusinessRuleException("Receive all pending photos for this location before approval");
        }
    }
}
