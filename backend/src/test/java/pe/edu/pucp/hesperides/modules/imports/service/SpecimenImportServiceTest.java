package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenResolver;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecimenImportServiceTest {

    @Mock private SpecimenResolver resolver;
    @Mock private ImportBatchGate gate;
    @Mock private SpecimenImportWriter writer;
    @Mock private SpecimenLookupRepository lookup;

    private SpecimenImportService service;
    private Batch batch;
    private Claimed claimed;
    private SpecimenPreview preview;

    @BeforeEach
    void setUp() {
        service = new SpecimenImportService(resolver, gate, writer, lookup);
        batch = new Batch(12, "specimens", "PREVIEWED", 7, "saved-preview", LocalDateTime.now().plusMinutes(30));
        claimed = new Claimed(batch, 7);
        preview = new SpecimenPreview(3, false, List.of(
                row(2, null, ImportAction.CREATE, null),
                row(3, null, ImportAction.CREATE, "EV-000111"),
                row(4, "EV-000112", ImportAction.UPDATE, null)),
                List.of(), List.of(), Map.of(), List.of());
    }

    @Test
    void confirmationSummaryCountsTheSameIncludedRowsTheWriterWillReceive() {
        Map<Integer, Boolean> decisions = Map.of(3, false);
        when(gate.report(batch, SpecimenPreview.class)).thenReturn(preview);

        var summary = service.confirmationSummary(claimed, decisions);

        assertThat(summary.batchId()).isEqualTo(12);
        assertThat(summary.toCreate()).isEqualTo(1);
        assertThat(summary.toUpdate()).isEqualTo(1);
        assertThat(summary.fingerprint())
                .isEqualTo(ImportBatchGate.confirmationFingerprint(batch, decisions));
        verify(writer).verifyVersions(preview.rows(), false);
        verify(resolver).verifyDuplicatePlanCurrent(preview.rows());
    }

    @Test
    void summaryDoesNotReturnCountsWhenTheSavedPlanHasBecomeStale() {
        when(gate.report(batch, SpecimenPreview.class)).thenReturn(preview);
        doThrow(new BusinessRuleException("A specimen changed after the preview"))
                .when(writer).verifyVersions(preview.rows(), false);

        assertThatThrownBy(() -> service.confirmationSummary(claimed, Map.of(3, true)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("changed after the preview");

        verify(resolver, never()).verifyDuplicatePlanCurrent(preview.rows());
    }

    @Test
    void fingerprintChangesWhenTheSavedPlanOrDuplicateDecisionChanges() {
        String original = ImportBatchGate.confirmationFingerprint(batch, Map.of(3, true));
        Batch changedPlan = new Batch(12, "specimens", "PREVIEWED", 7,
                "a-different-saved-preview", batch.expiresAt());

        assertThat(ImportBatchGate.confirmationFingerprint(batch, Map.of(3, false))).isNotEqualTo(original);
        assertThat(ImportBatchGate.confirmationFingerprint(changedPlan, Map.of(3, true))).isNotEqualTo(original);
        assertThat(ImportBatchGate.confirmationFingerprint(batch, Map.of(3, true)))
                .isEqualTo(ImportBatchGate.confirmationFingerprint(batch, Map.of(3, true)));
    }

    @Test
    void fingerprintDoesNotDependOnTheIterationOrderOfDuplicateDecisions() {
        Map<Integer, Boolean> firstOrder = new java.util.LinkedHashMap<>();
        firstOrder.put(7, false);
        firstOrder.put(3, true);
        Map<Integer, Boolean> secondOrder = new java.util.LinkedHashMap<>();
        secondOrder.put(3, true);
        secondOrder.put(7, false);

        assertThat(ImportBatchGate.confirmationFingerprint(batch, firstOrder))
                .isEqualTo(ImportBatchGate.confirmationFingerprint(batch, secondOrder));
    }

    @Test
    void rejectsConfirmationWhenThePreviewOrDecisionsNoLongerMatchTheSummary() {
        String fingerprint = ImportBatchGate.confirmationFingerprint(batch, Map.of(3, false));

        ImportBatchGate.verifyConfirmationFingerprint(batch, Map.of(3, false), fingerprint);
        assertThatThrownBy(() -> ImportBatchGate.verifyConfirmationFingerprint(batch, Map.of(3, true), fingerprint))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("This preview changed");

        Batch changed = new Batch(batch.id(), batch.kind(), batch.status(), batch.createdBy(),
                "re-analyzed-report", batch.expiresAt());
        assertThatThrownBy(() -> ImportBatchGate.verifyConfirmationFingerprint(changed, Map.of(3, false), fingerprint))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("This preview changed");
    }

    @Test
    void anUndecidedPossibleDuplicateHasNoSummary() {
        when(gate.report(batch, SpecimenPreview.class)).thenReturn(preview);
        assertThatThrownBy(() -> service.confirmationSummary(claimed, Map.of()))
                .isInstanceOf(pe.edu.pucp.hesperides.shared.exception.ValidationException.class)
                .hasMessageContaining("Decide on the possible duplicates");

        verifyNoInteractions(writer, resolver);
    }

    private static PlannedRow row(int line, String code, ImportAction action, String duplicateOf) {
        SpecimenDraft draft = new SpecimenDraft(line, code, "Schinus molle", -12.07, -77.08,
                null, null, null, null, null, null, null, null);
        return new PlannedRow(draft, action, 1L, "schinus-molle", "Schinus molle", true, "TREE",
                "species-fingerprint", action == ImportAction.UPDATE ? "specimen-fingerprint" : null,
                "SCIENTIFIC_NAME", action == ImportAction.UPDATE ? 1L : null,
                action == ImportAction.UPDATE ? "Schinus molle" : null, duplicateOf,
                duplicateOf == null ? null : 0.5);
    }
}
