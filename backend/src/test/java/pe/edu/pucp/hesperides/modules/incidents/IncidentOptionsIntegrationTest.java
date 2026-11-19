package pe.edu.pucp.hesperides.modules.incidents;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/** Opciones de revisión: secciones, tipos provisionales con su clase y urgencias (SPEC-201 §3.6). */
@SpringBootTest @Testcontainers @Transactional
class IncidentOptionsIntegrationTest extends IncidentTestSupport {
    @org.junit.jupiter.api.Test
    void optionsListTheSectionsAndTheProvisionalTypesWithTheirClass() {
        var options = queries.options(coordinator);
        assertThat(options.sections()).isNotEmpty();
        assertThat(options.types()).anySatisfy(t -> {
            assertThat(t.code()).isEqualTo("BRANCH_AT_RISK");
            assertThat(t.classCode()).isEqualTo("TREES");
        });
        assertThat(options.urgencies()).extracting(o -> o.code()).contains("LOW", "MEDIUM", "HIGH");
    }
}
