package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokensRepository refreshTokensRepository;

    private RefreshTokenService service;

    private User user;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(refreshTokensRepository, 7);
        user = new User();
        user.setEmail("ana@pucp.edu.pe");
    }

    @Test
    void issuedTokenIsNeverStoredInPlainText() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        String rawToken = service.issue(user, ClientType.WEB, "Mozilla/5.0");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokensRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isNotEqualTo(rawToken);
        assertThat(saved.getValue().getTokenHash()).hasSize(64); // SHA-256 en hexadecimal
    }

    @Test
    void issuedTokenExpiresInTheConfiguredNumberOfDays() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.issue(user, ClientType.MOBILE, "okhttp");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokensRepository).saveAndFlush(saved.capture());
        long days = ChronoUnit.DAYS.between(saved.getValue().getIssuedAt(), saved.getValue().getExpiresAt());
        assertThat(days).isEqualTo(7);
    }

    @Test
    void twoIssuedTokensAreDifferent() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        String first = service.issue(user, ClientType.WEB, null);
        String second = service.issue(user, ClientType.WEB, null);

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void rotationRevokesTheOldTokenAndLinksTheChain() {
        RefreshToken existing = usableToken();
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(existing));
        // saveAndFlush devuelve la fila nueva ya con id, como haría la base.
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(inv -> {
            RefreshToken fresh = inv.getArgument(0);
            setId(fresh, 99L);
            return fresh;
        });
        when(refreshTokensRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshTokenService.RotationResult result =
                service.rotate("cualquier-token", ClientType.WEB, "Mozilla/5.0");

        assertThat(existing.getRevokedAt()).isNotNull();
        assertThat(existing.getReplacedById()).isEqualTo(99L);
        assertThat(result.rawToken()).isNotBlank();
        assertThat(result.user()).isEqualTo(existing.getUser());
    }

    @Test
    void reusingAnAlreadyRevokedTokenRevokesTheWholeChain() {
        RefreshToken revoked = usableToken();
        revoked.setRevokedAt(Instant.now().minusSeconds(60));
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.rotate("token-robado", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);

        verify(refreshTokensRepository).revokeAllForUser(anyLong(), any(Instant.class));
        // Ante un reuso no se emite ningún token nuevo: la sesión se cierra.
        verify(refreshTokensRepository, never()).save(any(RefreshToken.class));
        verify(refreshTokensRepository, never()).saveAndFlush(any(RefreshToken.class));
    }

    @Test
    void rotatingAnExpiredTokenFailsWithoutRevokingTheChain() {
        RefreshToken expired = usableToken();
        expired.setExpiresAt(Instant.now().minusSeconds(60));
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.rotate("token-vencido", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);

        // Vencer no es sospechoso: no hay motivo para cerrar las demás sesiones.
        verify(refreshTokensRepository, never()).revokeAllForUser(anyLong(), any(Instant.class));
    }

    @Test
    void rotatingAnUnknownTokenFails() {
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("inventado", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);
    }

    private RefreshToken usableToken() {
        User owner = new User();
        owner.setEmail("ana@pucp.edu.pe");
        setId(owner, 1L);

        RefreshToken token = new RefreshToken();
        setId(token, 10L);
        token.setUser(owner);
        token.setTokenHash("hash");
        token.setIssuedAt(Instant.now().minusSeconds(3600));
        token.setExpiresAt(Instant.now().plusSeconds(3600));
        token.setClientType(ClientType.WEB);
        return token;
    }

    private void setId(Object entity, Long id) {
        try {
            Field field = BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("No se pudo fijar el id en el test", ex);
        }
    }
}
