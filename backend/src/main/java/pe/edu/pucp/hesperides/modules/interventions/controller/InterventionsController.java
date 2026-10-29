package pe.edu.pucp.hesperides.modules.interventions.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.*;
import pe.edu.pucp.hesperides.modules.interventions.service.InterventionsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/interventions")
@PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR','SUPERVISOR','OPERARIO')")
public class InterventionsController {
    private final InterventionsService service;
    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    public ResponseEntity<ApiResponse<Void>> invalidInput(Exception exception){
        return ResponseEntity.badRequest().body(ApiResponse.error("Invalid intervention request format"));
    }
    @GetMapping
    public ResponseEntity<ApiResponse<Page<InterventionSummaryResponse>>> getAll(@ModelAttribute Filter filter,
            @PageableDefault(size=20,sort="scheduledDate",direction=org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable){
        return ResponseEntity.ok(ApiResponse.ok("Interventions retrieved",service.findAll(filter,pageable)));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> getById(@PathVariable Long id){
        return ResponseEntity.ok(ApiResponse.ok("Intervention retrieved",service.findById(id)));
    }
    @GetMapping("/options")
    public ResponseEntity<ApiResponse<Map<String,Object>>> getOptions(){
        return ResponseEntity.ok(ApiResponse.ok("Assignment options retrieved",service.options()));
    }
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> create(@Valid @RequestBody Planning request,
            @RequestHeader(value="Idempotency-Key",required=false) String key){
        var result=service.create(request,parseKey(key));
        if(result.replay())return ResponseEntity.ok(ApiResponse.ok("Intervention already created",result.intervention()));
        return ResponseEntity.created(URI.create("/api/v1/interventions/"+result.intervention().getId())).body(ApiResponse.ok("Intervention created",result.intervention()));
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> update(@PathVariable Long id,@Valid @RequestBody Planning request){
        return ResponseEntity.ok(ApiResponse.ok("Intervention updated",service.update(id,request)));
    }
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyAuthority('COORDINADOR','SUPERVISOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> assign(@PathVariable Long id,@Valid @RequestBody Assignment request){
        return ResponseEntity.ok(ApiResponse.ok("Intervention assigned",service.assign(id,request)));
    }
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> cancel(@PathVariable Long id,@Valid @RequestBody Cancellation request){
        return ResponseEntity.ok(ApiResponse.ok("Intervention cancelled",service.cancel(id,request)));
    }
    @PostMapping("/{id}/locations/{locationId}/start")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR','OPERARIO')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> start(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Start request) {
        return ResponseEntity.ok(ApiResponse.ok("Location started", service.start(id, locationId, request)));
    }

    @PutMapping("/{id}/locations/{locationId}/execution")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR','OPERARIO')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> saveExecution(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Execution request) {
        return ResponseEntity.ok(ApiResponse.ok("Location progress saved", service.saveExecution(id, locationId, request)));
    }

    @PostMapping("/{id}/locations/{locationId}/complete")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR','OPERARIO')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> complete(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Completion request) {
        return ResponseEntity.ok(ApiResponse.ok("Location completed", service.complete(id, locationId, request)));
    }

    @PostMapping("/{id}/locations/{locationId}/validate")
    @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> validateLocation(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Review request) {
        return ResponseEntity.ok(ApiResponse.ok("Location approved", service.validateLocation(id, locationId, request)));
    }

    @PostMapping("/{id}/locations/{locationId}/observe")
    @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> observe(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Observation request) {
        return ResponseEntity.ok(ApiResponse.ok("Location observed", service.observe(id, locationId, request)));
    }

    @PostMapping("/{id}/locations/{locationId}/reopen")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<ApiResponse<InterventionDetailResponse>> reopen(@PathVariable Long id,
            @PathVariable Long locationId, @Valid @RequestBody Review request) {
        return ResponseEntity.ok(ApiResponse.ok("Location reopened for correction", service.reopen(id, locationId, request)));
    }

    @PostMapping("/{id}/evidences")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR','OPERARIO')")
    public ResponseEntity<ApiResponse<InterventionEvidenceResponse>> announceEvidence(@PathVariable Long id,
            @Valid @RequestBody Evidence request, @RequestHeader(value="Idempotency-Key",required=false) String key) {
        var result = service.announceEvidence(id, request, parseKey(key));
        return ResponseEntity.status(result.replay() ? 200 : 201)
                .body(ApiResponse.ok(result.replay() ? "Evidence already announced" : "Evidence announced", result.evidence()));
    }

    @PutMapping(value="/{id}/evidences/{evidenceId}/file", consumes=org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('SUPERVISOR','OPERARIO')")
    public ResponseEntity<ApiResponse<InterventionEvidenceResponse>> uploadEvidence(@PathVariable Long id,
            @PathVariable Long evidenceId, @RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Evidence file received", service.uploadEvidence(id, evidenceId, file)));
    }

    @GetMapping("/{id}/evidences/{evidenceId}/file")
    public ResponseEntity<byte[]> evidenceFile(@PathVariable Long id, @PathVariable Long evidenceId) {
        var file = service.evidenceFile(id, evidenceId);
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
                .cacheControl(org.springframework.http.CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff").body(file.bytes());
    }

    private UUID parseKey(String key) {
        try {
            UUID parsed = UUID.fromString(key);
            if (!parsed.toString().equalsIgnoreCase(key)) throw new IllegalArgumentException();
            return parsed;
        } catch (IllegalArgumentException | NullPointerException invalid) {
            throw new ValidationException("Idempotency-Key UUID is required");
        }
    }
}
