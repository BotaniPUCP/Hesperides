package pe.edu.pucp.hesperides.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SPEC-108 D-03: los nombres son los de Jean Piero. Corrección del 14 nov 2026: el complejo del código 61 es
 * la Biblioteca de Ciencias Sociales y el edificio del código 32, el Departamento Académico de Humanidades
 * (oficinas). Solo cambia el nombre; las etiquetas oficiales del plano y los demás edificios no se tocan.
 */
@Testcontainers
class BuildingNamesMigrationTest {

    private static final String PREVIOUS_VERSION = "51";
    private static final String NAMES_VERSION = "52";
    private static final String LIBRARY = "8f79b2cc-6701-4f4e-87f7-13db06a89a48";
    private static final String HUMANITIES = "c657216b-dded-46da-91bd-57fd0fc3b60e";

    @Container
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    private static JdbcTemplate db;
    private static String libraryBefore;
    private static String humanitiesBefore;
    private static long versionBefore;

    @BeforeAll
    static void migrate() {
        db = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        flyway(PREVIOUS_VERSION).migrate();
        libraryBefore = nameOf(LIBRARY);
        humanitiesBefore = nameOf(HUMANITIES);
        versionBefore = mapVersion();
        db.execute("CREATE TABLE names_before AS SELECT id, name FROM campus_buildings");
        flyway(NAMES_VERSION).migrate();
    }

    @Test
    void venianConLosNombresEquivocados() {
        assertThat(libraryBefore).isEqualTo("Facultad de Ciencias Sociales");
        assertThat(humanitiesBefore).isEqualTo("Facultad de Letras y Ciencias Humanas");
    }

    @Test
    void elCodigo61EsLaBibliotecaDeCienciasSociales() {
        assertThat(nameOf(LIBRARY)).isEqualTo("Biblioteca de Ciencias Sociales");
    }

    @Test
    void elCodigo32EsElDepartamentoAcademicoDeHumanidades() {
        assertThat(nameOf(HUMANITIES)).isEqualTo("Departamento Académico de Humanidades (oficinas)");
    }

    @Test
    void lasEtiquetasOficialesNoCambian() {
        assertThat(labelOf("61")).isEqualTo("COMPLEJO DE CIENCIAS SOCIALES");
        assertThat(labelOf("32")).isEqualTo("DEPARTAMENTO ACADÉMICO DE HUMANIDADES (OFICINAS)");
    }

    @Test
    void ningunOtroEdificioCambiaDeNombre() {
        Integer changed = db.queryForObject("""
                SELECT count(*) FROM campus_buildings b JOIN names_before n ON n.id = b.id
                WHERE b.name IS DISTINCT FROM n.name""", Integer.class);
        assertThat(changed).isEqualTo(2);
    }

    @Test
    void elMapaSabeQueSusDatosCambiaron() {
        assertThat(mapVersion()).isGreaterThan(versionBefore);
    }

    private static Flyway flyway(String version) {
        return Flyway.configure().dataSource(db.getDataSource())
                .locations("classpath:db/migration").target(version).cleanDisabled(true).load();
    }

    private static String nameOf(String planKey) {
        return db.queryForObject("SELECT name FROM campus_buildings WHERE plan_key = ? AND deleted_at IS NULL",
                String.class, planKey);
    }

    private static String labelOf(String code) {
        return db.queryForObject("SELECT official_label FROM campus_building_codes WHERE code = ? AND deleted_at IS NULL",
                String.class, code);
    }

    private static long mapVersion() {
        return db.queryForObject("SELECT version FROM map_data_version WHERE id = 1", Long.class);
    }
}
