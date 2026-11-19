package pe.edu.pucp.hesperides.engine.directory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DirectoryKeyTest {

    @Test
    void accentsCapitalsAndOuterSpacesDoNotMatter() {
        assertThat(DirectoryKey.of("  Estudios Generales CIENCIAS ")).isEqualTo(DirectoryKey.of("estudios generales ciencias"));
        assertThat(DirectoryKey.of("Psicología")).isEqualTo("psicologia");
    }

    @Test
    void theEnyeKeepsItsBaseLetter() {
        assertThat(DirectoryKey.of("Cañete")).isEqualTo("canete");
    }

    @Test
    void differentWordsStayDifferent() {
        assertThat(DirectoryKey.of("OIE - AITEL")).isNotEqualTo(DirectoryKey.of("OIE"));
    }

    @Test
    void nullHasNoKey() {
        assertThat(DirectoryKey.of(null)).isNull();
    }
}
