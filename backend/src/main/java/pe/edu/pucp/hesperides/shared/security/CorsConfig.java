package pe.edu.pucp.hesperides.shared.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.util.List;

/**
 * CORS del frontend. El navegador llama a la API desde otra origin
 * (http://localhost:3000 → http://localhost:8080) y con cookie de refresh
 * (credentials), así que sin Access-Control-Allow-* la respuesta ni se lee y
 * el frontend reporta "Sin conexión" aunque el backend responda.
 *
 * La origin permitida se deduce de {hesperides.app.public-url}: es la URL
 * pública del frontend (SPEC-100 §4), una variable requerida sin default, por
 * lo que aquí tampoco hay magic-origin hardcodeada.
 */
@Configuration
public class CorsConfig {

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${hesperides.app.public-url}") String appPublicUrl) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(originOf(appPublicUrl)));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /** scheme://host[:port] sin path: es lo que el navegador manda en Origin. */
    private static String originOf(String publicUrl) {
        try {
            URI uri = URI.create(publicUrl);
            return uri.getPort() == -1
                    ? uri.getScheme() + "://" + uri.getHost()
                    : uri.getScheme() + "://" + uri.getHost() + ":" + uri.getPort();
        } catch (IllegalArgumentException e) {
            return publicUrl;
        }
    }
}