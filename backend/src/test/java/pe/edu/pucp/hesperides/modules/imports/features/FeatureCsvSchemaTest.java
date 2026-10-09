package pe.edu.pucp.hesperides.modules.imports.features;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureCsvSchema.Parsed;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureVocabulary.Item;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FeatureCsvSchemaTest {

    private static final FeatureVocabulary VOCAB = new FeatureVocabulary(
            List.of(new Item("PAPER", "Papel y Cartón"), new Item("GLASS", "Vidrio")),
            List.of(new Item("FOUNTAIN", "Fuente"), new Item("BOTTLE_FILLER", "Llenador de botella")),
            List.of(new Item("OPERATIONAL", "Operativo"), new Item("DETERIORATED", "En deterioro")));

    private static Parsed parse(FeatureKind kind, String csv) {
        return FeatureCsvSchema.parse(CsvTable.parse(csv.getBytes(StandardCharsets.UTF_8)), kind, VOCAB);
    }

    @Test
    void wasteStreamsAreAListOfLabelsWrittenAnyWay() {
        Parsed p = parse(FeatureKind.WASTE_BIN, "latitud;longitud;lugar;residuos\n-12.07;-77.08;Biblioteca;papel y carton | VIDRIO\n");

        assertThat(p.issues()).isEmpty();
        FeatureDraft d = p.drafts().get(0);
        assertThat(d.name()).isEqualTo("Biblioteca");
        assertThat(d.attributes()).containsEntry("residuos", List.of("Papel y Cartón", "Vidrio"));
    }

    @Test
    void fountainKindAndStatusAreStoredAsCodes() {
        Parsed p = parse(FeatureKind.DRINKING_FOUNTAIN, "latitud;longitud;tipo;estado;sector\n-12.07;-77.08;Llenador de botella;operativo;CIA\n");

        assertThat(p.drafts().get(0).attributes())
                .isEqualTo(Map.of("tipo", "BOTTLE_FILLER", "estado", "OPERATIONAL", "sector", "CIA"));
    }

    @Test
    void aValueOutsideItsListIsAFormatErrorThatSaysWhatIsValid() {
        Parsed p = parse(FeatureKind.DRINKING_FOUNTAIN, "latitud;longitud;estado\n-12.07;-77.08;roto\n");

        assertThat(p.drafts()).isEmpty();
        assertThat(p.issues()).singleElement().satisfies(i -> {
            assertThat(i.line()).isEqualTo(2);
            assertThat(i.column()).isEqualTo("estado");
            assertThat(i.message()).isEqualTo("«roto» is not a valid value. Use: Operativo, En deterioro");
        });
    }

    @Test
    void emptyCellsAreLeftOutSoACorrectionKeepsThem() {
        Parsed p = parse(FeatureKind.WASTE_BIN, "codigo;latitud;longitud;residuos;nota\nPT_44;-12.07;-77.08;;\n");

        assertThat(p.drafts().get(0).attributes()).isEmpty();
        assertThat(p.drafts().get(0).code()).isEqualTo("PT_44");
    }

    @Test
    void coordinatesAreRequired() {
        Parsed p = parse(FeatureKind.WASTE_BIN, "latitud;longitud;lugar\n;-77.08;Biblioteca\n");

        assertThat(p.issues()).extracting(i -> i.column()).containsExactly("latitud");
    }

    @Test
    void aColumnOfTheOtherStandardIsUnknown() {
        Parsed p = parse(FeatureKind.WASTE_BIN, "latitud;longitud;estado\n-12.07;-77.08;operativo\n");

        assertThat(p.issues()).singleElement().satisfies(i -> {
            assertThat(i.line()).isEqualTo(1);
            assertThat(i.column()).isEqualTo("estado");
        });
    }
}
