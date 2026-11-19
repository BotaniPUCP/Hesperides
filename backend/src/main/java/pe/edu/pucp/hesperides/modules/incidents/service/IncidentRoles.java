package pe.edu.pucp.hesperides.modules.incidents.service;

import pe.edu.pucp.hesperides.shared.security.RoleCodes;
import java.util.Set;

/** Quién participa en incidencias y quién las gestiona; administración gestiona igual que coordinación. */
public final class IncidentRoles {
    private static final Set<String> MANAGERS = Set.of(RoleCodes.ADMIN, RoleCodes.COORDINADOR);
    private static final Set<String> MEMBERS = Set.of(RoleCodes.ADMIN, RoleCodes.COORDINADOR, RoleCodes.SUPERVISOR);

    private IncidentRoles() {
    }

    public static boolean manages(String roleCode) {
        return MANAGERS.contains(roleCode);
    }

    public static boolean participates(String roleCode) {
        return MEMBERS.contains(roleCode);
    }
}
