package pe.edu.pucp.hesperides.modules.imports.csv;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** El estándar común de los CSV (SPEC-103 §6.1). */
class CsvTableTest {

    private static CsvTable parse(String text) {
        return CsvTable.parse(text.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void readsSemicolonSeparatedRowsWithTheirLineNumber() {
        CsvTable t = parse("codigo;latitud\nEV-000001;-12.067\n;-12.068\n");

        assertThat(t.header()).containsExactly("codigo", "latitud");
        assertThat(t.rows()).hasSize(2);
        assertThat(t.rows().get(0).get("codigo")).isEqualTo("EV-000001");
        assertThat(t.rows().get(1).get("codigo")).isEmpty();
        assertThat(t.rows().get(1).line()).isEqualTo(3);
    }

    @Test
    void acceptsTheBomThatExcelWrites() {
        assertThat(parse("﻿codigo;latitud\nx;1\n").header()).containsExactly("codigo", "latitud");
    }

    @Test
    void quotedCellsMayContainSemicolonsQuotesAndLineBreaks() {
        CsvTable t = parse("lugar;nota\n\"Frente a \"\"Tinkuy\"\"; lado norte\";\"dos\nlineas\"\n");

        assertThat(t.rows().get(0).get("lugar")).isEqualTo("Frente a \"Tinkuy\"; lado norte");
        assertThat(t.rows().get(0).get("nota")).isEqualTo("dos\nlineas");
    }

    @Test
    void windowsLineEndingsAndBlankLinesAreIgnored() {
        assertThat(parse("a;b\r\n1;2\r\n\r\n3;4\r\n").rows()).hasSize(2);
    }

    @Test
    void headerNamesAreTrimmedAndLowercased() {
        assertThat(parse(" Codigo ;LATITUD\nx;1\n").header()).containsExactly("codigo", "latitud");
    }

    @Test
    void aCommaSeparatedFileIsRejectedWithAClearMessage() {
        assertThatThrownBy(() -> parse("codigo,latitud,longitud\nx,1,2\n"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("semicolon");
    }

    @Test
    void anEmptyFileIsRejected() {
        assertThatThrownBy(() -> parse("")).isInstanceOf(ValidationException.class);
    }

    @Test
    void aRowWithMoreCellsThanTheHeaderIsReportedByLine() {
        assertThatThrownBy(() -> parse("a;b\n1;2;3\n"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("line 2");
    }

    @Test
    void decimalsAcceptPointAndToleratedComma() {
        assertThat(Cells.decimal("-12.067")).isEqualTo(-12.067);
        assertThat(Cells.decimal("-12,067")).isEqualTo(-12.067);
        assertThat(Cells.usesDecimalComma("-12,067")).isTrue();
        assertThat(Cells.usesDecimalComma("-12.067")).isFalse();
    }
}
