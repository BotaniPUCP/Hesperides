package pe.edu.pucp.hesperides.modules.map.service;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El modelo y el manifiesto que viajan en el jar (SPEC-108 D-06). Se leen de
 * verdad: si el generador dejara el manifiesto de otra versión del GLB, el visor
 * ubicaría los nodos de un modelo con el anclaje de otro.
 */
class BuildingModelServiceTest {

    private final BuildingModelService service = new BuildingModelService();

    @Test
    void theModelIsABinaryGltf() {
        assertThat(new String(service.model(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("glTF");
    }

    @Test
    void theEtagIsTheQuotedHashOfTheModel() throws Exception {
        String sha256 = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(service.model()));

        assertThat(service.etag()).isEqualTo("\"" + sha256 + "\"");
    }

    @Test
    void theManifestBelongsToThisModel() {
        JsonNode manifest = new ObjectMapper().readTree(service.manifestJson());

        assertThat("\"" + manifest.get("version").asString() + "\"").isEqualTo(service.etag());
        assertThat(manifest.get("anchor").get("lat").isNumber()).isTrue();
        assertThat(manifest.get("nodes").isObject()).isTrue();
    }

    @Test
    void theFilesAreReadOnce() {
        assertThat(service.model()).isSameAs(service.model());
        assertThat(service.manifestJson()).isSameAs(service.manifestJson());
    }
}
