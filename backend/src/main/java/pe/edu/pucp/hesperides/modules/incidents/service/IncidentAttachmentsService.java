package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentPhoto;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentPhotosRepository;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentUpdatesRepository;
import pe.edu.pucp.hesperides.shared.exception.*;
import pe.edu.pucp.hesperides.shared.storage.StoredFileNotFoundException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Base64;
import java.util.UUID;

/** Fotos privadas y comentarios, cada uno reintentable sin duplicarse (SPEC-201 §2.6). */
@Service @RequiredArgsConstructor
public class IncidentAttachmentsService {
    static final int MAX_PHOTOS = 6;
    private final IncidentAccess access;
    private final IncidentPhotosRepository photos;
    private final IncidentUpdatesRepository updates;
    private final IncidentFiles files;
    private final IncidentTimeline timeline;
    private final IncidentDetails details;
    private final RequestFingerprint fingerprint;

    @Transactional
    public PhotoResponse addPhoto(Long id, UUID reference, MultipartFile file, String email) {
        User actor = access.actor(email);
        Incident incident = access.visible(id, actor, true);
        if (incident.isClosed()) throw new BusinessRuleException("Incident already closed");
        if ("OPERARIO".equals(actor.getRoleCode()) && !incident.getReportedBy().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the reporter can add photos");
        }
        byte[] bytes = bytes(file);
        String type = files.contentType(bytes), hash = fingerprint.digest(bytes);
        var existing = photos.findByIncidentIdAndClientReferenceAndDeletedAtIsNull(id, reference);
        if (existing.isPresent()) {
            fingerprint.requireSame(existing.get().getRequestHash(), hash);
            return response(existing.get());
        }
        if (photos.countByIncidentIdAndDeletedAtIsNull(id) >= MAX_PHOTOS) throw new BusinessRuleException("Photo limit reached");
        var photo = new IncidentPhoto();
        photo.setIncident(incident);
        photo.setStorageKey(files.write(bytes, type));
        photo.setContentType(type);
        photo.setSizeBytes(bytes.length);
        photo.setUploadedBy(actor);
        photo.setClientReference(reference);
        photo.setRequestHash(hash);
        return response(photos.saveAndFlush(photo));
    }

    @Transactional(readOnly = true)
    public PhotoContentResponse photo(Long id, Long photoId, String email) {
        access.visible(id, access.actor(email), false);
        IncidentPhoto photo = photos.findByIdAndIncidentIdAndDeletedAtIsNull(photoId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        try {
            return new PhotoContentResponse(photo.getContentType(), Base64.getEncoder().encodeToString(files.read(photo.getStorageKey())));
        } catch (StoredFileNotFoundException ex) {
            throw new ResourceNotFoundException("Photo not found");
        }
    }

    @Transactional
    public DetailResponse comment(Long id, CommentRequest request, String email) {
        User actor = access.actor(email);
        Incident incident = access.visible(id, actor, true);
        String hash = fingerprint.of(request);
        var existing = updates.findByIncidentIdAndClientReferenceAndDeletedAtIsNull(id, request.clientReference());
        if (existing.isPresent()) {
            if (!existing.get().getAuthor().getId().equals(actor.getId())) {
                throw new ConflictException("Request reference already used with different content");
            }
            fingerprint.requireSame(existing.get().getRequestHash(), hash);
        } else {
            timeline.record(incident, actor, "COMMENT", request.body().trim(), request.clientReference(), hash);
        }
        return details.of(incident, actor);
    }

    private static byte[] bytes(MultipartFile file) {
        if (file.getSize() > IncidentFiles.MAX_BYTES) throw new ValidationException("Invalid photo size");
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static PhotoResponse response(IncidentPhoto p) {
        return new PhotoResponse(p.getId(), p.getContentType(), p.getSizeBytes(), p.getCreatedAt());
    }
}
