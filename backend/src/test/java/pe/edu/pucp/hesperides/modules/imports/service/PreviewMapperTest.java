package pe.edu.pucp.hesperides.modules.imports.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PreviewMapperTest {

    @Test
    void includesOnlyActualSpeciesChangesInTheSpecimenPreview() {
        SpecimenPreview.PlannedRow changed = row("EV-000001", 1L, "Roystonea regia", 2L, "Schinus molle");
        SpecimenPreview.PlannedRow unchanged = row("EV-000002", 2L, "Schinus molle", 2L, "Schinus molle");
        SpecimenPreview preview = new SpecimenPreview(2, false, List.of(changed, unchanged), List.of(), List.of(),
                Map.of(), List.of());

        var response = PreviewMapper.toResponse(1L, "specimens", preview, LocalDateTime.now(), "plan-fingerprint");

        assertThat(response.planFingerprint()).isEqualTo("plan-fingerprint");
        assertThat(response.speciesChanges()).containsExactly(
                new pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse.SpecimenSpeciesChange(
                        "EV-000001", "Roystonea regia", "Schinus molle"));
    }

    private static SpecimenPreview.PlannedRow row(String code, Long previousSpeciesId, String previousName,
                                                   long speciesId, String speciesName) {
        return new SpecimenPreview.PlannedRow(
                new SpecimenDraft(2, code, speciesName, -12.07, -77.08, null, null, null, null,
                        null, null, null, null),
                ImportAction.UPDATE, speciesId, speciesName.toLowerCase().replace(' ', '-'), speciesName,
                true, "TREE", "species-fingerprint", "specimen-fingerprint", "SCIENTIFIC_NAME",
                previousSpeciesId, previousName, null, null);
    }
}
