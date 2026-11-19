package pe.edu.pucp.hesperides.modules.map.service;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/**
 * El modelo y el manifiesto que viajan en el jar (SPEC-108 D-06). Se leen de
 * verdad: si el generador dejara el manifiesto de otra versión del GLB, el visor
 * ubicaría los nodos de un modelo con el anclaje de otro.
 */
class BuildingModelServiceTest {

    private static final double SHIFTED_ANCHOR_LAT = -12.069617565150319;
    private static final double SHIFTED_ANCHOR_LON = -77.08020997892712;
    /** Unos 0,1 mm: solo un anclaje regenerado o corrido otra vez cae fuera. */
    private static final double ANCHOR_TOLERANCE_DEG = 1e-9;

    private final BuildingModelService service = new BuildingModelService();

    @Test
    void theModelIsABinaryGltf() {
        assertThat(new String(service.model(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("glTF");
    }

    @Test
    void theEtagStartsWithTheHashOfTheModel() throws Exception {
        assertThat(service.etag()).startsWith("\"" + sha256(service.model()));
    }

    @Test
    void aManifestCorrectedWithoutANewModelGetsItsOwnEtag() throws Exception {
        // 14 nov 2026: el anclaje se corrió hacia los jardines sin tocar el GLB. Con la etiqueta del GLB sola,
        // el navegador revalidaría, recibiría 304 y seguiría ubicando el modelo con el anclaje viejo.
        byte[] model = "glTF modelo".getBytes(StandardCharsets.US_ASCII);
        String version = sha256(model) + ".jardines";

        BuildingModelService corrected = new BuildingModelService(model, "{\"version\":\"" + version + "\"}");

        assertThat(corrected.etag()).isEqualTo("\"" + version + "\"");
    }

    @Test
    void aManifestOfAnotherModelFailsAtStartup() {
        byte[] model = "glTF modelo".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(() -> new BuildingModelService(model, "{\"version\":\"otro\"}"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no corresponde al GLB");
    }

    @Test
    void aManifestWithoutVersionFailsAtStartup() {
        byte[] model = "glTF modelo".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(() -> new BuildingModelService(model, "{}"))
                .isInstanceOf(IllegalStateException.class);
    }

    private static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    @Test
    void theManifestBelongsToThisModel() {
        JsonNode manifest = new ObjectMapper().readTree(service.manifestJson());

        assertThat("\"" + manifest.get("version").asString() + "\"").isEqualTo(service.etag());
        assertThat(manifest.get("anchor").get("lat").isNumber()).isTrue();
        assertThat(manifest.get("nodes").isObject()).isTrue();
    }

    @Test
    void theAnchorIsTheOneShiftedTowardsTheGardens() {
        // 14 nov 2026 (V053): el anclaje se corrió 2,6 m al oeste y 2,6 m al sur, a mano. generar_modelo.py todavía
        // escribe el de transformacion.npz: si se vuelve a correr sin reaplicar el corrimiento (ver
        // scripts/mapa/plano_pucp/README.md), las mallas quedarían 3,7 m al noreste de sus huellas de la base.
        JsonNode anchor = new ObjectMapper().readTree(service.manifestJson()).get("anchor");

        assertThat(anchor.get("lat").asDouble()).isCloseTo(SHIFTED_ANCHOR_LAT, within(ANCHOR_TOLERANCE_DEG));
        assertThat(anchor.get("lon").asDouble()).isCloseTo(SHIFTED_ANCHOR_LON, within(ANCHOR_TOLERANCE_DEG));
    }

    @Test
    void theFilesAreReadOnce() {
        assertThat(service.model()).isSameAs(service.model());
        assertThat(service.manifestJson()).isSameAs(service.manifestJson());
    }
}
