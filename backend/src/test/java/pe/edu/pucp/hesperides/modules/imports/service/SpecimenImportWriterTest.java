package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenWriter;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SpecimenImportWriterTest {

    @Test
    void rejectsSpecimenOrTargetSpeciesChangesSincePreview() {
        SpecimenLookupRepository lookup = mock(SpecimenLookupRepository.class);
        SpecimenImportWriter writer = new SpecimenImportWriter(mock(SpecimenWriter.class),
                mock(PhotoRepository.class), mock(ImportPhotos.class), mock(ImportBatchGate.class), lookup,
                mock(pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenResolver.class),
                mock(TransactionTemplate.class));
        PlannedRow row = new PlannedRow(
                new pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft(2, "EV-000001",
                        "Schinus molle", -12.07, -77.08, null, null, null, null, null, null, null, null),
                pe.edu.pucp.hesperides.modules.imports.ImportAction.UPDATE, 2, "schinus-molle", "Schinus molle",
                true, "TREE", "species-before", "specimen-before", "SCIENTIFIC_NAME", 1L,
                "Roystonea regia", null, null);

        when(lookup.speciesDataFingerprints(Set.of(2L), false)).thenReturn(Map.of(2L, "species-before"));
        when(lookup.specimenDataFingerprints(Set.of("EV-000001"), false))
                .thenReturn(Map.of("EV-000001", "specimen-before"));
        assertThatCode(() -> writer.verifyVersions(List.of(row), false)).doesNotThrowAnyException();

        when(lookup.specimenDataFingerprints(Set.of("EV-000001"), false))
                .thenReturn(Map.of("EV-000001", "specimen-after"));
        assertThatThrownBy(() -> writer.verifyVersions(List.of(row), false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("specimen changed after the preview");

        when(lookup.speciesDataFingerprints(Set.of(2L), false)).thenReturn(Map.of(2L, "species-after"));
        when(lookup.specimenDataFingerprints(Set.of("EV-000001"), false))
                .thenReturn(Map.of("EV-000001", "specimen-before"));
        assertThatThrownBy(() -> writer.verifyVersions(List.of(row), false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("species changed after the preview");
    }
}
