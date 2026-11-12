package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentSuggestions;
import static org.assertj.core.api.Assertions.assertThat;

class IncidentSuggestionsTest {
    @Test void suggestsOnlyExplicitPositiveDescriptions() {
        assertThat(IncidentSuggestions.typeCode("Rama caída en puerta principal")).isEqualTo("FALLEN_BRANCH");
        assertThat(IncidentSuggestions.typeCode("No hay rama caída, hay una fuga de agua")).isNull();
        assertThat(IncidentSuggestions.typeCode("Algo pasó cerca de la puerta")).isNull();
    }
}
