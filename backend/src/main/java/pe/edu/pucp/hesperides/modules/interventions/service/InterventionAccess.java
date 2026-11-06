package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionReferencesRepository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import java.util.Objects;

/** Shared resource scope, including when a different module displays linked work. */
@Component @RequiredArgsConstructor
public class InterventionAccess {
    private final InterventionReferencesRepository references;
    public boolean canCreate(User user) { return java.util.Set.of("ADMIN","COORDINADOR").contains(user.getRoleCode()); }
    public boolean canRead(User user, Long team, Long assignee) {
        return switch (user.getRoleCode()) {
            case "ADMIN", "COORDINADOR" -> true;
            case "SUPERVISOR" -> references.supervises(user.getId(), team);
            case "OPERARIO" -> Objects.equals(user.getId(), assignee);
            default -> false;
        };
    }
    public void requireRead(User user, Long team, Long assignee) {
        if (!canRead(user, team, assignee)) throw new ResourceNotFoundException("Intervention not found");
    }
}
