package pe.edu.pucp.hesperides.support;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Única fuente de la imagen de base de datos de las pruebas de integración.
 *
 * Es la misma que usa docker-compose: las migraciones activan PostGIS (V004) y
 * una imagen `postgres` sin la extensión las haría fallar a todas. Tener la
 * imagen en un solo sitio evita que una prueba nueva vuelva a copiar la antigua.
 */
public final class TestDatabase {

    private static final DockerImageName IMAGE =
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres");

    private TestDatabase() {
    }

    public static PostgreSQLContainer<?> newContainer() {
        return new PostgreSQLContainer<>(IMAGE);
    }
}
