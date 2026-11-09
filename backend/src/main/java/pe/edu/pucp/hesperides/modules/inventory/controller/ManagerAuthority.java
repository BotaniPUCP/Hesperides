package pe.edu.pucp.hesperides.modules.inventory.controller;

import org.springframework.security.core.userdetails.UserDetails;

import java.util.Set;

/** Quién puede tomar las decisiones de seguridad del catálogo de especies (SPEC-105 §3.1). */
public final class ManagerAuthority {

    private static final Set<String> MANAGERS = Set.of("ADMIN", "COORDINADOR");

    private ManagerAuthority() {
    }

    public static boolean isManager(UserDetails principal) {
        return principal.getAuthorities().stream().anyMatch(a -> MANAGERS.contains(a.getAuthority()));
    }
}
