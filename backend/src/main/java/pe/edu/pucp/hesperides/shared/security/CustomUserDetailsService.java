package pe.edu.pucp.hesperides.shared.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;

import java.util.List;

/**
 * Carga el usuario en cada request. Consultar la base en cada llamada es
 * deliberado: es lo que hace que desactivar una cuenta surta efecto sin
 * esperar a que expire su access token (SPEC-001 §2.6).
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsersRepository usersRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        User user = usersRepository.findActiveByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // La authority es el code tal cual, sin prefijo ROLE_, para que coincida
        // exactamente con catalog_items.code y se use con hasAuthority.
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority(user.getRoleCode())))
                .disabled(!user.isActive())
                .build();
    }
}
