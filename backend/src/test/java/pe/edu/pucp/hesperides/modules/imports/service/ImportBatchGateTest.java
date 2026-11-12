package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportBatchGateTest {

    @Mock private ImportBatchRepository batches;
    @Mock private SpecimenLookupRepository lookup;
    @Mock private FileStorage storage;
    @Mock private ObjectMapper json;

    @Test
    void openedFingerprintUsesTheReportAsPersistedByTheJsonbColumn() {
        LocalDateTime expires = LocalDateTime.now().plusMinutes(60);
        when(json.writeValueAsString("plan")).thenReturn("compact json produced before insert");
        when(lookup.userId("owner@example.test")).thenReturn(7L);
        when(batches.create(eq("specimens"), eq("load.csv"), eq(7L),
                eq("compact json produced before insert"), any(LocalDateTime.class))).thenReturn(12L);
        when(batches.find(12L)).thenReturn(Optional.of(batch("jsonb canonical report", expires)));

        var opened = new ImportBatchGate(batches, lookup, storage, json)
                .open("specimens", "load.csv", "owner@example.test", "plan", null);

        assertThat(opened.planFingerprint())
                .isEqualTo(ImportBatchGate.planFingerprint(12L, "jsonb canonical report"));
    }

    @Test
    void replacedFingerprintUsesTheNewPersistedJsonbReport() {
        LocalDateTime expires = LocalDateTime.now().plusMinutes(60);
        var previous = batch("old canonical report", expires);
        var claimed = new ImportBatchGate.Claimed(previous, 7L);
        when(json.writeValueAsString("new plan")).thenReturn("compact new report");
        when(batches.replacePreview(12L, 7L, "old canonical report", "compact new report")).thenReturn(true);
        when(batches.find(12L)).thenReturn(Optional.of(batch("new jsonb canonical report", expires)));

        var opened = new ImportBatchGate(batches, lookup, storage, json).replacePreview(claimed, "new plan", null);

        assertThat(opened.planFingerprint())
                .isEqualTo(ImportBatchGate.planFingerprint(12L, "new jsonb canonical report"));
    }

    private static ImportBatchRepository.Batch batch(String report, LocalDateTime expires) {
        return new ImportBatchRepository.Batch(12L, "specimens", "PREVIEWED", 7L, report, expires);
    }
}
