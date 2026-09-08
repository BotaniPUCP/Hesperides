package pe.edu.pucp.hesperides.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "una-clave-de-prueba-suficientemente-larga-para-hs256!!";

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, 1800, 7);
    }

    @Test
    void generatesATokenThatValidatesAndCarriesEmailAndRole() {
        String token = provider.generateAccessToken("ana@pucp.edu.pe", "COORDINADOR");

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.extractEmail(token)).isEqualTo("ana@pucp.edu.pe");
        assertThat(provider.extractRoleCode(token)).isEqualTo("COORDINADOR");
    }

    @Test
    void rejectsATamperedToken() {
        String token = provider.generateAccessToken("ana@pucp.edu.pe", "ADMIN");
        String tampered = token.substring(0, token.length() - 4) + "AAAA";

        assertThat(provider.validateToken(tampered)).isFalse();
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() {
        JwtTokenProvider otherProvider =
                new JwtTokenProvider("otra-clave-distinta-igual-de-larga-para-hs256!!!", 1800, 7);
        String foreignToken = otherProvider.generateAccessToken("ana@pucp.edu.pe", "ADMIN");

        assertThat(provider.validateToken(foreignToken)).isFalse();
    }

    @Test
    void rejectsAnExpiredToken() {
        JwtTokenProvider instantExpiry = new JwtTokenProvider(SECRET, -1, 7);
        String expired = instantExpiry.generateAccessToken("ana@pucp.edu.pe", "ADMIN");

        assertThat(provider.validateToken(expired)).isFalse();
    }

    @Test
    void rejectsGarbageInsteadOfThrowing() {
        assertThat(provider.validateToken("esto-no-es-un-jwt")).isFalse();
        assertThat(provider.validateToken("")).isFalse();
    }

    @Test
    void exposesTheConfiguredValidityForTheLoginResponse() {
        assertThat(provider.getAccessTokenValiditySeconds()).isEqualTo(1800);
    }
}