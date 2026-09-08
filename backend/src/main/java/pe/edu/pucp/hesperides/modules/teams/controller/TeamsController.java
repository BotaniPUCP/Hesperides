package pe.edu.pucp.hesperides.modules.teams.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamsRepository;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

/** Par de id+nombre de las cuadrillas activas para el filtro del listado de usuarios. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teams")
public class TeamsController {

    private final TeamsRepository teamsRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TeamOption>>> list() {
        List<TeamOption> options = teamsRepository.findAllByActiveTrueAndDeletedAtIsNullOrderByNameAsc()
                .stream()
                .map(team -> new TeamOption(team.getId(), team.getName()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Teams retrieved successfully", options));
    }

    public record TeamOption(Long id, String name) {
    }
}