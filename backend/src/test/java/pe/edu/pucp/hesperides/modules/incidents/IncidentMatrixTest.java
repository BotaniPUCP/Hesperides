package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentMatrix;
import java.util.Arrays;
import static org.assertj.core.api.Assertions.assertThat;

class IncidentMatrixTest {
    @Test void csvQuotesCommasQuotesNewlinesAndNulls() {
        assertThat(IncidentMatrix.csv(Arrays.asList("Seguridad, Ambiental", "Dijo \"rama\"", "a\nb", null)))
                .isEqualTo("\"Seguridad, Ambiental\",\"Dijo \"\"rama\"\"\",\"a\nb\",\"\"");
    }

    @Test void csvNeutralizesSpreadsheetFormulasIncludingLeadingWhitespace() {
        assertThat(IncidentMatrix.csv(Arrays.asList("=1+1", " +SUM(A1)", "-1", "@SUM(A1)", "\tformula", "texto")))
                .isEqualTo("\"'=1+1\",\"' +SUM(A1)\",\"'-1\",\"'@SUM(A1)\",\"'\tformula\",\"texto\"");
    }
}
