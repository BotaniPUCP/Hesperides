package pe.edu.pucp.hesperides.modules.maintenance.service;

import java.time.Instant;
import java.time.LocalDate;

/** One accepted location attempt; physical completion and approval are distinct facts. */
public record LocationExecution(Long interventionId, String interventionCode, Long locationId,
        int attemptNumber, String targetKind, Long targetId, String targetLabel,
        Long zoneId, Long placeId, Instant completedAt, Instant validatedAt, Instant approvedAt,
        LocalDate executionDate, LocalDate approvalDate) {}
