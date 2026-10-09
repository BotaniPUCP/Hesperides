package pe.edu.pucp.hesperides.modules.imports.csv;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CsvWriterTest {

    private static final List<String> COLUMNS = List.of("codigo", "observaciones");

    @Test
    void writesAHeaderAndOneLinePerRowWithABom() {
        String csv = new String(CsvWriter.write(COLUMNS, List.of(Map.of("codigo", "EV-000001", "observaciones", "Sana"))),
                StandardCharsets.UTF_8);

        assertThat(csv).isEqualTo("﻿codigo;observaciones\nEV-000001;Sana\n");
    }

    @Test
    void aMissingOrNullCellIsEmpty() {
        assertThat(CsvWriter.cell(null)).isEmpty();
        String csv = new String(CsvWriter.write(COLUMNS, List.of(Map.of("codigo", "EV-000002"))), StandardCharsets.UTF_8);
        assertThat(csv).endsWith("EV-000002;\n");
    }

    @Test
    void quotesOnlyTheCellsThatNeedIt() {
        assertThat(CsvWriter.cell("Molle")).isEqualTo("Molle");
        assertThat(CsvWriter.cell("ramas; raíces")).isEqualTo("\"ramas; raíces\"");
        assertThat(CsvWriter.cell("dice \"seco\"")).isEqualTo("\"dice \"\"seco\"\"\"");
        assertThat(CsvWriter.cell("dos\nlíneas")).isEqualTo("\"dos\nlíneas\"");
    }

    @Test
    void whatItWritesReadsBackTheSame() {
        String tricky = "Poda; revisar \"raíz\"\ny copa";
        byte[] csv = CsvWriter.write(COLUMNS, List.of(Map.of("codigo", "EV-000003", "observaciones", tricky)));

        CsvTable table = CsvTable.parse(csv);

        assertThat(table.header()).containsExactlyElementsOf(COLUMNS);
        assertThat(table.rows().get(0).get("observaciones")).isEqualTo(tricky);
    }
}
