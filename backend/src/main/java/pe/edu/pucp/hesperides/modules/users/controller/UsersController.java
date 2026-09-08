package pe.edu.pucp.hesperides.modules.users.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UsersPage;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.net.URI;

/**
 * Los nueve endpoints de SPEC-100 §3. La autorización declarativa mínima va en
 * @PreAuthorize; la fina (alcance de cuadrilla, propia ficha, último ADMIN)
 * vive en UsersService porque depende del dato consultado.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UsersController {

    private final UsersService usersService;
    private final UsersRepository usersRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR','SUPERVISOR')")
    public ResponseEntity<ApiResponse<UsersPage<UserResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Long teamId,
            @PageableDefault(size = 20, sort = "lastName", direction = org.springframework.data.domain.Sort.Direction.ASC)
            Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

        UsersPage<UserResponse> page = usersService.list(search, roleCode, isActive, teamId, pageable,
                currentUser(principal));
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", page));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> get(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("User retrieved successfully",
                usersService.get(id, currentUser(principal))));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        UserResponse created = usersService.create(request);
        UsersService.DeliveryOutcome outcome =
                usersService.deliverCredentials(created.id(), request.initialPassword());
        String message = outcome.delivered()
                ? "User created successfully"
                : "User created, but credential delivery failed";
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/v1/users/" + created.id()))
                .body(ApiResponse.ok(message, outcome.user()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("User updated successfully",
                usersService.update(id, request)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> deactivate(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("User deactivated successfully",
                usersService.deactivate(id, currentUser(principal))));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> reactivate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("User reactivated successfully",
                usersService.reactivate(id)));
    }

    @PostMapping("/{id}/resend-credentials")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UsersService.CredentialsDeliveryResult>> resendCredentials(
            @PathVariable Long id) {
        UsersService.ResendResult reset = usersService.resendCredentials(id);
        UsersService.DeliveryOutcome outcome =
                usersService.deliverCredentials(reset.id(), reset.temporaryPassword());
        String message = outcome.delivered()
                ? "Credentials sent successfully"
                : "Credential delivery failed";
        return ResponseEntity.ok(ApiResponse.ok(message, toDeliveryResult(outcome)));
    }

    @PostMapping("/{id}/mark-credentials-delivered")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> markCredentialsDelivered(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Credentials marked as delivered",
                usersService.markCredentialsDelivered(id)));
    }

    @PostMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeOwnPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        usersService.changeOwnPassword(currentUser(principal).getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Password updated successfully", null));
    }

    private UsersService.CredentialsDeliveryResult toDeliveryResult(UsersService.DeliveryOutcome outcome) {
        return new UsersService.CredentialsDeliveryResult(
                outcome.user().id(), outcome.user().email(), outcome.user().credentialStatus());
    }

    private User currentUser(UserDetails principal) {
        return usersRepository.findActiveByEmail(principal.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));
    }
}