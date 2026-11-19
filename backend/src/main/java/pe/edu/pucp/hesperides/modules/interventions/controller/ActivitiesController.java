package pe.edu.pucp.hesperides.modules.interventions.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.interventions.dto.ActivityRequests.*;
import pe.edu.pucp.hesperides.modules.interventions.service.ActivitiesService;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/activities") @RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR','SUPERVISOR')")
public class ActivitiesController {
    private final ActivitiesService service;
    private ResponseEntity<ApiResponse<Map<String,Object>>> ok(Map<String,Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("Activity retrieved",data));
    }
    @GetMapping public ResponseEntity<?> list(@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,@RequestParam(required=false) String statusCode) {
        return ok(service.list(page,size,statusCode));
    }
    @GetMapping("/options") public ResponseEntity<?> options() {return ok(service.options());}
    @GetMapping("/{id}") public ResponseEntity<?> detail(@PathVariable long id) {return ok(service.detail(id));}
    @GetMapping("/{id}/map-options") public ResponseEntity<?> mapOptions(@PathVariable long id) {
        return ResponseEntity.ok(ApiResponse.ok("Activity map targets",service.mapOptions(id)));
    }
    @PostMapping @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR')")
    public ResponseEntity<?> create(@Valid @RequestBody Planning request,@RequestHeader("Idempotency-Key") String key) {
        UUID parsed;
        try {parsed=UUID.fromString(key);if(!parsed.toString().equalsIgnoreCase(key))throw new IllegalArgumentException();}
        catch(IllegalArgumentException e){throw new ValidationException("Idempotency-Key UUID is required");}
        var result=service.create(request,parsed);
        return ResponseEntity.status(result.replay()?200:201).body(ApiResponse.ok("Activity created",result.data()));
    }
    @PutMapping("/{id}/planning") @PreAuthorize("hasAnyAuthority('ADMIN','COORDINADOR')")
    public ResponseEntity<?> planning(@PathVariable long id,@Valid @RequestBody Planning request) {return ok(service.updatePlanning(id,request));}
    @PutMapping("/{id}/responsible") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<?> responsible(@PathVariable long id,@Valid @RequestBody Responsible request) {return ok(service.responsible(id,request));}
    @PostMapping("/{id}/progress") @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<?> progress(@PathVariable long id,@Valid @RequestBody Progress request) {return ok(service.progress(id,request));}
    @PostMapping("/{id}/approve") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<?> approve(@PathVariable long id,@Valid @RequestBody Version request) {return ok(service.approve(id,request));}
    @PostMapping("/{id}/cancel") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<?> cancel(@PathVariable long id,@Valid @RequestBody Cancel request) {return ok(service.cancel(id,request));}
    @PostMapping("/{id}/evidences") @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<?> evidence(@PathVariable long id,@Valid @RequestBody Evidence request) {return ok(service.announce(id,request));}
    @PutMapping(value="/{id}/evidences/{evidenceId}/file",consumes="multipart/form-data")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<?> upload(@PathVariable long id,@PathVariable long evidenceId,@RequestPart("file") MultipartFile file) {return ok(service.upload(id,evidenceId,file));}
    @GetMapping("/{id}/evidences/{evidenceId}/file") public ResponseEntity<byte[]> file(@PathVariable long id,@PathVariable long evidenceId) {
        var file=service.file(id,evidenceId);
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
            .cacheControl(org.springframework.http.CacheControl.noStore().cachePrivate()).header("X-Content-Type-Options","nosniff").body(file.bytes());
    }
}
