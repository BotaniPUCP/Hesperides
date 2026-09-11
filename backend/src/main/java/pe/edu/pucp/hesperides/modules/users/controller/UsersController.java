package pe.edu.pucp.hesperides.modules.users.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;

/**
 * Parsea, delega y envuelve. Ninguna regla de negocio vive aquí: las reglas del
 * último ADMIN, la normalización del correo y la orquestación del envío están en
 * el servicio.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UsersController {

    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    private static final String ADMIN_ONLY = "hasAuthority('ADMIN')";

    private final UsersService usersService;

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<Page<UserDetailResponse>>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Long teamId,
            // Orden por apellido y no por createdAt: este listado se usa para
            // buscar a una persona concreta (SPEC-100 §3).
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC)
            Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

        Page<UserDetailResponse> page = usersService.findAll(
                search, roleCode, isActive, teamId, pageable, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", page));
    }

    @GetMapping("/{id}")
    // Solo exige estar autenticado: el alcance real lo aplica el servicio vía
    // UserScopeResolver. Un OPERARIO tiene su propio id en visibleUserIds y ve su
    // ficha, pero recibe 404 en la de cualquier otro. No se puede expresar aquí
    // porque UserDetails conoce el correo, no el id.
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getById(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {

        UserDetailResponse user = usersService.findById(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("User retrieved successfully", user));
    }

    @PostMapping
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> create(
            @Valid @RequestBody CreateUserRequest request) {

        UsersService.CreationResult result = usersService.create(request);
        String message = result.delivered()
                ? "User created successfully"
                : "User created, but credential delivery failed";

        return ResponseEntity.created(URI.create("/api/v1/users/" + result.user().id()))
                .body(ApiResponse.ok(message, result.user()));
    }

    @PutMapping("/{id}")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {

        return ResponseEntity.ok(
                ApiResponse.ok("User updated successfully", usersService.update(id, request)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> deactivate(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(ApiResponse.ok("User deactivated successfully",
                usersService.deactivate(id, principal.getUsername())));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> reactivate(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.ok("User reactivated successfully", usersService.reactivate(id)));
    }

    @PostMapping("/{id}/resend-credentials")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CredentialDeliveryResponse>> resendCredentials(
            @PathVariable Long id) {

        CredentialDeliveryResponse result = usersService.resendCredentials(id);
        String message = result.credentialStatus() == CredentialStatus.DELIVERED
                ? "Credentials sent successfully"
                : "Credential delivery failed";

        return ResponseEntity.ok(ApiResponse.ok(message, result));
    }

    @PostMapping("/{id}/mark-credentials-delivered")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> markCredentialsDelivered(
            @PathVariable Long id) {

        return ResponseEntity.ok(ApiResponse.ok("Credentials marked as delivered",
                usersService.markCredentialsDelivered(id)));
    }

    @PostMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeOwnPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        usersService.changeOwnPassword(principal.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.ok("Password updated successfully", null));
    }
}
