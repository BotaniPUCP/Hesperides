package pe.edu.pucp.hesperides.modules.map.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.http.converter.autoconfigure.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.tomcat.autoconfigure.servlet.TomcatServletWebServerAutoConfiguration;
import org.springframework.boot.webmvc.autoconfigure.DispatcherServletAutoConfiguration;
import org.springframework.boot.webmvc.autoconfigure.WebMvcAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pe.edu.pucp.hesperides.modules.map.service.BuildingModelService;
import pe.edu.pucp.hesperides.modules.map.service.LocationDescriptionService;
import pe.edu.pucp.hesperides.modules.map.service.MapLayersService;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.zip.GZIPInputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La compresión la hace Tomcat, no Spring MVC: solo se prueba con un servidor de
 * verdad. Este contexto levanta Tomcat con el controlador del mapa, sin base de
 * datos ni seguridad (la sesión se prueba en MapControllerTest).
 *
 * Lee el application.yml de producción: el de tests lo reemplaza y no trae
 * {@code server.compression}, y lo que se prueba es la configuración real.
 */
@SpringBootTest(classes = BuildingModelCompressionTest.Server.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.config.location=file:src/main/resources/application.yml")
class BuildingModelCompressionTest {

    @Configuration
    @ImportAutoConfiguration({TomcatServletWebServerAutoConfiguration.class, DispatcherServletAutoConfiguration.class,
            WebMvcAutoConfiguration.class, HttpMessageConvertersAutoConfiguration.class,
            JacksonAutoConfiguration.class})
    @Import({MapController.class, BuildingModelService.class})
    static class Server {
    }

    @LocalServerPort private int port;
    @Autowired private BuildingModelService modelService;

    @MockitoBean private MapLayersService layersService;
    @MockitoBean private LocationDescriptionService descriptionService;

    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void theModelTravelsGzippedWhenTheClientAcceptsIt() throws Exception {
        HttpResponse<byte[]> response = getModel("gzip");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Encoding")).hasValue("gzip");
        assertThat(response.headers().firstValue("ETag")).hasValue("W/" + modelService.etag());
        assertThat(response.body().length).isLessThan(modelService.model().length / 2);
        assertThat(gunzip(response.body())).isEqualTo(modelService.model());
    }

    @Test
    void withoutAcceptEncodingTheModelTravelsAsIs() throws Exception {
        HttpResponse<byte[]> response = getModel(null);

        assertThat(response.headers().firstValue("Content-Encoding")).isEmpty();
        assertThat(response.body()).isEqualTo(modelService.model());
    }

    private HttpResponse<byte[]> getModel(String acceptEncoding) throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + "/api/v1/map/models/buildings"));
        if (acceptEncoding != null) {
            request.header("Accept-Encoding", acceptEncoding);
        }
        return client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    private static byte[] gunzip(byte[] body) throws IOException {
        try (GZIPInputStream in = new GZIPInputStream(new ByteArrayInputStream(body))) {
            return in.readAllBytes();
        }
    }
}
