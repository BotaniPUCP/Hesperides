package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ReferenceTextTest {

    @ParameterizedTest(name = "«{0}» es {1}")
    @CsvSource({
            "Espalda de civil, BACK",
            "Estacionamiento Espacios culturales - atrás de polideportivo, BACK",
            "Detrás del comedor, BACK",
            "Al costado de la cancha 1, SIDE",
            "Jardin Lateral McGregor, SIDE",
            "Al lado del coro de música, SIDE",
            "Frente a DARS, FRONT"})
    void detectsTheSideFromTheWords(String text, PerspectiveSide expected) {
        assertThat(ReferenceText.parse(text).side()).isEqualTo(expected);
    }

    @Test
    void frontIsUncertainBecauseFrenteASometimesMeansAcrossTheStreet() {
        assertThat(ReferenceText.parse("Frente a Gelarti - sociales").sideUncertain()).isTrue();
        assertThat(ReferenceText.parse("Espalda de civil").sideUncertain()).isFalse();
    }

    @Test
    void aPlainNameHasNoSide() {
        ReferenceText text = ReferenceText.parse("Pabellón Z");
        assertThat(text.side()).isNull();
        assertThat(text.placeText()).isEqualTo("pabellon z");
    }

    @Test
    void theFirstSideWordWins() {
        assertThat(ReferenceText.parse("Espalda de gelarti costado del pabellón e estudio generales ciencias").side())
                .isEqualTo(PerspectiveSide.BACK);
    }

    @Test
    void thePlaceTextDropsSideWordsConnectorsPunctuationAndAccents() {
        assertThat(ReferenceText.parse("Espalda de civil").placeText()).isEqualTo("civil");
        assertThat(ReferenceText.parse("Frente a Gelarti - sociales").placeText()).isEqualTo("gelarti sociales");
        assertThat(ReferenceText.parse("Al costado de la cancha 1").placeText()).isEqualTo("cancha 1");
        assertThat(ReferenceText.parse("Detrás del Laboratorio (hidráulica)").placeText()).isEqualTo("laboratorio hidraulica");
    }

    @Test
    void anEmptyTextHasNothing() {
        ReferenceText text = ReferenceText.parse("  ");
        assertThat(text.side()).isNull();
        assertThat(text.placeText()).isEmpty();
    }
}
