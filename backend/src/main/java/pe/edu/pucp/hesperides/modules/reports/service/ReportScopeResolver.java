package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamsRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Resolves the reader's scope with the same rule irrigation applies (SPEC-202
 * D-08): a SUPERVISOR's sectors are the {@code teams.zone_id} of the active teams
 * they lead. ADMIN gets the campus explicitly, without changing the global role
 * mapping (D-07).
 */
@Component
@RequiredArgsConstructor
public class ReportScopeResolver {

    private final UsersRepository users;
    private final TeamsRepository teams;
    private final IrrigationZoneQueries zones;

    @Transactional(readOnly = true)
    public ReportScope resolve(String email) {
        User user = users.findActiveByEmail(email)
                .filter(User::isActive)
                .orElseThrow(() -> new AccessDeniedException("Sin sesión válida"));
        Set<Long> activeSectors = zones.sectors().stream()
                .map(IrrigationZoneResponse::id)
                .collect(Collectors.toSet());
        String role = user.getRoleCode();
        if ("ADMIN".equals(role) || "COORDINADOR".equals(role)) {
            return new ReportScope(user.getId(), role, true, List.of(), activeSectors);
        }
        if ("SUPERVISOR".equals(role)) {
            List<Long> led = teams.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNullOrderByNameAsc(user.getId())
                    .stream().map(Team::getId).toList();
            Set<Long> sectors = new HashSet<>(zones.activeSectorsOfSupervisor(user.getId()));
            sectors.retainAll(activeSectors);
            return new ReportScope(user.getId(), role, false, led, Set.copyOf(sectors));
        }
        throw new AccessDeniedException("Rol sin acceso a reportes");
    }
}
