package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ImportServiceTest {

    @Test
    void rejectsConfirmationWhenThePreviewOrDecisionsDifferFromTheSummary() {
        ImportBatchGate gate = mock(ImportBatchGate.class);
        ImportHandler specimens = mock(ImportHandler.class);
        Batch batch = new Batch(12, "specimens", "PREVIEWED", 7, "current-report", LocalDateTime.now().plusMinutes(10));
        ImportBatchGate.Claimed claimed = new ImportBatchGate.Claimed(batch, 7);
        Map<Integer, Boolean> currentDecisions = Map.of(3, false);
        String staleFingerprint = ImportBatchGate.confirmationFingerprint(batch, Map.of(3, true));

        when(specimens.kinds()).thenReturn(Set.of("specimens"));
        ImportService service = new ImportService(java.util.List.of(specimens), gate, new ImportLock());
        when(gate.confirmedResult(12, "admin@example.test", Set.of("specimens", "species")))
                .thenReturn(Optional.empty());
        when(gate.claim(12, "admin@example.test")).thenReturn(claimed);

        assertThatThrownBy(() -> service.confirm(12, currentDecisions, staleFingerprint, "admin@example.test"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("This preview changed");

        verify(specimens, never()).confirm(claimed, currentDecisions);
    }

    @Test
    void acceptsTheFingerprintForTheCurrentPlanAndDecisions() {
        ImportBatchGate gate = mock(ImportBatchGate.class);
        ImportHandler specimens = mock(ImportHandler.class);
        Batch batch = new Batch(12, "specimens", "PREVIEWED", 7, "current-report", LocalDateTime.now().plusMinutes(10));
        ImportBatchGate.Claimed claimed = new ImportBatchGate.Claimed(batch, 7);
        Map<Integer, Boolean> decisions = Map.of(3, false);
        String fingerprint = ImportBatchGate.confirmationFingerprint(batch, decisions);
        ImportResultResponse result = new ImportResultResponse(12, 1, 0, 1, java.util.List.of(), java.util.List.of(),
                java.util.List.of("EV-000966"));

        when(specimens.kinds()).thenReturn(Set.of("specimens"));
        ImportService service = new ImportService(java.util.List.of(specimens), gate, new ImportLock());
        when(gate.confirmedResult(12, "admin@example.test", Set.of("specimens", "species")))
                .thenReturn(Optional.empty());
        when(gate.claim(12, "admin@example.test")).thenReturn(claimed);
        when(specimens.confirm(claimed, decisions)).thenReturn(result);

        org.assertj.core.api.Assertions.assertThat(service.confirm(12, decisions, fingerprint, "admin@example.test"))
                .isSameAs(result);
        verify(specimens).confirm(claimed, decisions);
    }

    @Test
    void requiresAConfirmationSummaryForSpecimenImports() {
        ImportBatchGate gate = mock(ImportBatchGate.class);
        ImportHandler specimens = mock(ImportHandler.class);
        Batch batch = new Batch(12, "specimens", "PREVIEWED", 7, "current-report", LocalDateTime.now().plusMinutes(10));
        ImportBatchGate.Claimed claimed = new ImportBatchGate.Claimed(batch, 7);
        when(specimens.kinds()).thenReturn(Set.of("specimens"));
        ImportService service = new ImportService(java.util.List.of(specimens), gate, new ImportLock());
        when(gate.confirmedResult(12, "admin@example.test", Set.of("specimens", "species")))
                .thenReturn(Optional.empty());
        when(gate.claim(12, "admin@example.test")).thenReturn(claimed);

        assertThatThrownBy(() -> service.confirm(12, Map.of(), null, "admin@example.test"))
                .isInstanceOf(pe.edu.pucp.hesperides.shared.exception.ValidationException.class)
                .hasMessageContaining("confirmation summary");
        verify(specimens, never()).confirm(claimed, Map.of());
    }

    @Test
    void rejectsAConfirmationSummaryRequestedForAnOlderPreview() {
        ImportBatchGate gate = mock(ImportBatchGate.class);
        ImportHandler specimens = mock(ImportHandler.class);
        Batch batch = new Batch(12, "specimens", "PREVIEWED", 7, "current-report", LocalDateTime.now().plusMinutes(10));
        ImportBatchGate.Claimed claimed = new ImportBatchGate.Claimed(batch, 7);
        Map<Integer, Boolean> decisions = Map.of(3, false);
        when(specimens.kinds()).thenReturn(Set.of("specimens"));
        ImportService service = new ImportService(java.util.List.of(specimens), gate, new ImportLock());
        when(gate.claim(12, "admin@example.test")).thenReturn(claimed);

        String stalePreviewFingerprint = ImportBatchGate.planFingerprint(12, "old-report");
        assertThatThrownBy(() -> service.confirmationSummary(
                12, decisions, stalePreviewFingerprint, "admin@example.test"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("This preview changed");

        verify(specimens, never()).confirmationSummary(claimed, decisions);

        String currentFingerprint = ImportBatchGate.planFingerprint(12, batch.report());
        ImportConfirmationSummary expected = new ImportConfirmationSummary(12, 1, 2, "summary-fingerprint");
        when(specimens.confirmationSummary(claimed, decisions)).thenReturn(expected);
        assertThat(service.confirmationSummary(12, decisions, currentFingerprint, "admin@example.test"))
                .isEqualTo(expected);
        verify(specimens).confirmationSummary(claimed, decisions);
    }
}
