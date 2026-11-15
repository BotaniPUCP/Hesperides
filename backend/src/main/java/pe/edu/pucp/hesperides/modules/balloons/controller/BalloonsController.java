package pe.edu.pucp.hesperides.modules.balloons.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonsResponse;
import pe.edu.pucp.hesperides.modules.balloons.service.BalloonsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** SPEC-113 §3. Todos los roles con sesión ven todos los globos (D-05). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/map")
public class BalloonsController {

    private final BalloonsService service;

    /** Del presente: nunca se guarda en caché (§2.5). */
    @GetMapping("/balloons")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')")
    public ResponseEntity<ApiResponse<BalloonsResponse>> balloons() {
        BalloonsResponse response = service.balloons();
        String message = response.truncated()
                ? "Globos del mapa: se muestran los " + BalloonsService.MAX_BALLOONS + " más urgentes"
                : "Globos del mapa";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(message, response));
    }
}
