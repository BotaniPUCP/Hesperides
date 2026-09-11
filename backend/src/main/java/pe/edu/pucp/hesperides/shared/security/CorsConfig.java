package pe.edu.pucp.hesperides.shared.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * El frontend vive en otro puerto que el backend, así que toda llamada del
 * navegador es cross-origin y pasa por un preflight OPTIONS. Sin esta
 * configuración el navegador bloquea la respuesta y el cliente solo ve un
 * fallo de red, indistinguible de no tener conexión.
 *
 * SPEC-000 §4 reserva `config/` para CORS pero ningún spec lo detalló; esta
 * clase cierra ese hueco.
 */
@Configuration
public class CorsConfig {

    /**
     * Lista cerrada de orígenes. Nunca `*`: con allowCredentials activo, un
     * comodín permitiría que cualquier sitio llamara a esta API con la cookie
     * de sesión del usuario — y el propio navegador rechaza esa combinación.
     */
    private final List<String> allowedOrigins;

    public CorsConfig(
            @Value("${hesperides.security.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = List.of(allowedOrigins.split(","));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Client-Type"));

        // Imprescindible para la cookie httpOnly del refresh token: sin esto el
        // navegador no la envía ni guarda la que llega en Set-Cookie.
        configuration.setAllowCredentials(true);

        // Una hora de caché del preflight: evita un OPTIONS extra antes de cada
        // petición sin volver inmanejable un cambio de configuración.
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
