package pe.edu.pucp.hesperides.modules.interventions.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record InterventionEvidenceResponse(Long id, Long interventionVersion, Long interventionLocationId,
        int attemptNumber, UUID clientReference, String momentCode, Long greenElementId,
        Instant uploadedAt, String fileUrl, String caption) {}
