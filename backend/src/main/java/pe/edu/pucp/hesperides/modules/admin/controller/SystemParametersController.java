package pe.edu.pucp.hesperides.modules.admin.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.admin.dto.PasswordPolicyResponse;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.admin.dto.UpdateSystemParametersRequest;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParametersService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

/**
 * Expone los parámetros generales del sistema. Tanto la lectura como la
 * escritura quedan reservadas al ADMIN (SPEC-001 Anexo A): son la
 * configuración que gobierna el comportamiento global de la aplicación y su
 * edición es una actividad de administración.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system-parameters")
public class SystemParametersController {

    private final SystemParametersService systemParametersService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameterResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok("Parámetros obtenidos",
                systemParametersService.findAll()));
    }

    /**
     * El único fragmento de los parámetros que consume el resto de la app: la
     * longitud mínima que el checklist de contraseña pinta en vivo. No lleva
     * {@code @PreAuthorize} a propósito: la lectura del listado completo es
     * ADMIN, pero la política que gobierna cómo elegir una contraseña la
     * necesita cualquier usuario autenticado (SecurityConfig ya la exige).
     */
    @GetMapping("/password-policy")
    public ResponseEntity<ApiResponse<PasswordPolicyResponse>> getPasswordPolicy() {
        return ResponseEntity.ok(ApiResponse.ok("Política de contraseña obtenida",
                systemParametersService.getPasswordPolicy()));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameterResponse>>> update(
            @Valid @RequestBody UpdateSystemParametersRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Parámetros actualizados",
                systemParametersService.update(request.values())));
    }
}