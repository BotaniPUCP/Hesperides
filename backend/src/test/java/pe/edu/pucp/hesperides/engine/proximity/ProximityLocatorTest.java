package pe.edu.pucp.hesperides.engine.proximity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El algoritmo de cercanía del prototipo v39 (SPEC-102 D-04), sin base de datos:
 * las geometrías son cuadrados en metros sobre el plano local.
 */
class ProximityLocatorTest {

    private static final ProximityThresholds UMBRALES = new ProximityThresholds(0.5, 3, 10);

    /** Cuadrado de lado {@code lado} con esquina inferior izquierda en (x, y). */
    private static PlanarShape cuadrado(double x, double y, double lado) {
        double[] anillo = {x, y, x + lado, y, x + lado, y + lado, x, y + lado};
        return new PlanarShape(List.of(new PlanarPolygon(List.of(anillo))));
    }

    private static BuildingCandidate edificio(long id, String nombre, double x, double y) {
        return new BuildingCandidate(id, nombre, cuadrado(x, y, 10));
    }

    private static SectionCandidate seccion(long id, String nombre, double x, double y, double lado) {
        return new SectionCandidate(id, "AV-" + id, nombre, cuadrado(x, y, lado));
    }

    private static LocationDescription describir(double x, double y, List<SectionCandidate> secciones,
                                                 List<BuildingCandidate> edificios, List<NamedPoint> lugares) {
        return ProximityLocator.describe(new PlanarPoint(x, y), secciones, edificios, lugares, UMBRALES);
    }

    @Nested
    @DisplayName("Qué edificio describe el punto")
    class Prioridad {

        @Test
        @DisplayName("1. el edificio que contiene el punto")
        void dentroDeUnEdificio() {
            var resultado = describir(5, 5, List.of(), List.of(edificio(1, "Física", 0, 0)), List.of());

            assertThat(resultado.building().id()).isEqualTo(1);
            assertThat(resultado.relation()).isEqualTo(BuildingRelation.INSIDE);
            assertThat(resultado.distanceM()).isZero();
        }

        @Test
        @DisplayName("2. el edificio contiguo a la sección, aunque otro esté más cerca del punto")
        void contiguoALaSeccion() {
            // Sección de 0 a 20. Un edificio la toca por la derecha (x 20-30) y queda
            // a 18 m del punto. Otro está a 8 m del punto, pero a 6 m de la sección:
            // no es contiguo (umbral 3 m), así que no gana.
            var jardin = seccion(10, "Jardín Tinkuy", 0, 0, 20);
            var contiguo = edificio(1, "Tinkuy", 20, 5);
            var cercano = edificio(2, "Química", -16, 15);

            var resultado = describir(2, 18, List.of(jardin), List.of(contiguo, cercano), List.of());

            assertThat(resultado.section().id()).isEqualTo(10);
            assertThat(resultado.building().id()).isEqualTo(1);
            assertThat(resultado.relation()).isEqualTo(BuildingRelation.ADJACENT_TO_SECTION);
        }

        @Test
        @DisplayName("3. el edificio más cercano cuando la sección no tiene contiguos")
        void masCercano() {
            var jardin = seccion(10, "Jardín", 0, 0, 20);
            var lejano = edificio(1, "Lejano", 100, 100);
            var cerca = edificio(2, "Cerca", 40, 0);

            var resultado = describir(10, 10, List.of(jardin), List.of(lejano, cerca), List.of());

            assertThat(resultado.building().id()).isEqualTo(2);
            assertThat(resultado.relation()).isEqualTo(BuildingRelation.NEAREST);
            assertThat(resultado.distanceM()).isEqualTo(30.0);
        }

        @Test
        @DisplayName("un punto fuera de toda sección no falla: sección nula y edificio más cercano")
        void fueraDeLasSecciones() {
            var resultado = describir(500, 500, List.of(), List.of(edificio(1, "Física", 0, 0)), List.of());

            assertThat(resultado.section()).isNull();
            assertThat(resultado.building().id()).isEqualTo(1);
        }

        @Test
        @DisplayName("a igual distancia gana el de menor id, para que el resultado sea estable")
        void desempate() {
            var resultado = describir(15, 5, List.of(),
                    List.of(edificio(7, "B", 20, 0), edificio(3, "A", 0, 0)), List.of());

            assertThat(resultado.building().id()).isEqualTo(3);
        }

        @Test
        @DisplayName("sin edificios no hay edificio, y el texto lo dice")
        void sinEdificios() {
            var resultado = describir(5, 5, List.of(seccion(1, "Jardín", 0, 0, 10)), List.of(), List.of());

            assertThat(resultado.building()).isNull();
            assertThat(resultado.text()).isEqualTo("Jardín");
        }
    }

    @Nested
    @DisplayName("Qué nombre recibe el edificio")
    class Nombre {

        @Test
        @DisplayName("un edificio con nombre conserva el suyo")
        void conNombre() {
            var resultado = describir(5, 5, List.of(), List.of(edificio(1, "Física", 0, 0)),
                    List.of(new NamedPoint("Laboratorio", new PlanarPoint(5, 5))));

            assertThat(resultado.buildingName()).isEqualTo("Física");
        }

        @Test
        @DisplayName("sin nombre toma el de la referencia a 10 m o menos")
        void nombrePorReferencia() {
            var resultado = describir(5, 5, List.of(), List.of(edificio(1, null, 0, 0)),
                    List.of(new NamedPoint("Pabellón Z", new PlanarPoint(18, 5))));

            assertThat(resultado.buildingName()).isEqualTo("Pabellón Z");
        }

        @Test
        @DisplayName("sin nombre ni referencia cercana: «edificio sin nombre, junto a» el nombrado más cercano")
        void sinNombre() {
            var resultado = describir(5, 5, List.of(),
                    List.of(edificio(1, null, 0, 0), edificio(2, "Química", 30, 0)),
                    List.of(new NamedPoint("Lejos", new PlanarPoint(200, 200))));

            assertThat(resultado.buildingName()).isEqualTo("Edificio sin nombre, junto a Química");
        }
    }

    @Nested
    @DisplayName("Texto de la descripción")
    class Texto {

        @Test
        @DisplayName("dentro de un edificio y dentro de una sección")
        void dentro() {
            var resultado = describir(5, 5, List.of(seccion(9, "Jardín Central", 0, 0, 10)),
                    List.of(edificio(1, "Biblioteca Central", 0, 0)), List.of());

            assertThat(resultado.text()).isEqualTo("Jardín Central · dentro de Biblioteca Central");
        }

        @Test
        @DisplayName("junto a un edificio contiguo, con la distancia redondeada")
        void junto() {
            var resultado = describir(2, 18, List.of(seccion(10, "Jardín Tinkuy", 0, 0, 20)),
                    List.of(edificio(1, "Tinkuy", 20, 5)), List.of());

            assertThat(resultado.text()).isEqualTo("Jardín Tinkuy · junto a Tinkuy (a 18 m)");
        }

        @Test
        @DisplayName("fuera de las áreas verdes")
        void fuera() {
            var resultado = describir(40, 5, List.of(), List.of(edificio(1, "Física", 0, 0)), List.of());

            assertThat(resultado.text()).isEqualTo("Fuera de las áreas verdes · cerca de Física (a 30 m)");
        }
    }

    @Nested
    @DisplayName("Referencias que pueden dar nombre a un edificio")
    class ReferenciasUtiles {

        @Test
        @DisplayName("se excluyen las categorías que no son edificios")
        void categoriasExcluidas() {
            assertThat(NamingPlaces.canNameBuilding("Pastitos de Arqui", "Área verde")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Camino Inca", "Camino")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Puerta principal", "Entrada")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Estacionamiento L", "Estacionamiento")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Parque Las Palmeras", "Externo")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Pabellón Z", "Pabellones y Unidades académicas")).isTrue();
        }

        @Test
        @DisplayName("se excluyen las descripciones relativas, que no son nombres de lugar")
        void frasesRelativas() {
            assertThat(NamingPlaces.canNameBuilding("Frente a Gelarti - sociales", "Facultades")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Espalda de civil", "Facultades")).isFalse();
            assertThat(NamingPlaces.canNameBuilding("Dentro de aulas móviles B", "Edificio")).isFalse();
        }

        @Test
        @DisplayName("se quita el plus code de Google al inicio del nombre")
        void plusCode() {
            assertThat(NamingPlaces.clean("WWJ9+5XJ Centro de Asesoría Pastoral Universitaria"))
                    .isEqualTo("Centro de Asesoría Pastoral Universitaria");
        }
    }
}
