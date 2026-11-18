package pe.edu.pucp.hesperides.engine.search;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchKeyTest {

    @Test
    void joinsThePartsWithoutAccentsCapitalsOrSurroundingSpaces() {
        assertThat(SearchKey.of("INC-0007", "  Árbol caído ", "Junto al Pabellón Z")).isEqualTo("inc-0007 arbol caido junto al pabellon z");
    }

    @Test
    void skipsMissingParts() {
        assertThat(SearchKey.of("INC-0007", null, "", "Muñoz")).isEqualTo("inc-0007 munoz");
    }

    @Test
    void turnsTypographicDashesIntoHyphensLikeUnaccent() {
        assertThat(SearchKey.of("Tontodromo – educación")).isEqualTo("tontodromo - educacion");
    }

    @Test
    void nothingGivesAnEmptyKey() {
        assertThat(SearchKey.of()).isEmpty();
    }
}
