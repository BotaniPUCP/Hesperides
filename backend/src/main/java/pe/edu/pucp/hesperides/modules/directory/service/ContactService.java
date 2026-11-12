package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.directory.ContactPhones;
import pe.edu.pucp.hesperides.modules.directory.dto.ContactRequest;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.Created;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactRow;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactValues;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Altas, cambios, bajas y vínculos de contactos. Nombre, anexo, celular y correo
 * son datos personales: ni la auditoría ni los mensajes de error los repiten.
 * El rol del vínculo (D-08b) es el único dato del vínculo, y la auditoría lo
 * trata como el resto: dice que cambió, no a qué.
 */
@Service
@RequiredArgsConstructor
public class ContactService {

    private static final String ENTITY = "Contact";
    private static final int MAX_ROLE = 100;

    private final ContactRepository contacts;
    private final ActiveRecords active;
    private final AuditService audit;

    @Transactional
    public String create(ContactRequest request) {
        ContactValues values = resolve(request);
        List<Long> organizationIds = organizationIds(request);
        Map<Long, String> roles = linkRoles(request, organizationIds);
        Created created = contacts.insert(values);
        contacts.replaceLinks(created.id(), organizationIds, roles);
        audit.record(AuditActionCode.CONTACT_CREATED, ENTITY, created.id(),
                Map.of("organizations", organizationIds.size()));
        return created.code();
    }

    @Transactional
    public void update(String code, ContactRequest request) {
        ContactRow current = active.contact(code);
        ContactValues values = resolve(request);
        List<Long> organizationIds = organizationIds(request);
        Map<Long, String> roles = linkRoles(request, organizationIds);
        List<String> changed = changedFields(current, values);
        if (!organizationIds.stream().sorted().toList().equals(contacts.organizationIds(current.id()))) {
            changed.add("organizations");
        }
        contacts.update(current.id(), values);
        contacts.replaceLinks(current.id(), organizationIds, roles);
        audit.record(AuditActionCode.CONTACT_UPDATED, ENTITY, current.id(), Map.of("fields", changed));
    }

    /** Agrega una organización sin tocar los datos ni los demás vínculos (SPEC-106 §3.1). */
    @Transactional
    public void link(String code, String organizationCode, String role) {
        ContactRow contact = active.contact(code);
        OrganizationRow organization = active.organization(organizationCode);
        if (contacts.organizationIds(contact.id()).contains(organization.id())) {
            throw new DuplicateResourceException("The contact " + code + " already belongs to «" + organization.name() + "»");
        }
        contacts.link(contact.id(), organization.id(), linkRole(role));
        audit.record(AuditActionCode.CONTACT_LINKED, ENTITY, contact.id(), Map.of("organization", organizationCode));
    }

    /** Cambia solo el rol de un vínculo que ya existe; el rol viene nulo o con texto (D-08b). */
    @Transactional
    public void updateLinkRole(String code, String organizationCode, String role) {
        ContactRow contact = active.contact(code);
        OrganizationRow organization = active.organization(organizationCode);
        if (!contacts.organizationIds(contact.id()).contains(organization.id())) {
            throw new BusinessRuleException("The contact is not linked to that organization");
        }
        contacts.updateLinkRole(contact.id(), organization.id(), linkRole(role));
        audit.record(AuditActionCode.CONTACT_LINK_ROLE_UPDATED, ENTITY, contact.id(),
                Map.of("organization", organizationCode));
    }

    @Transactional
    public void deactivate(String code) {
        ContactRow contact = active.contact(code);
        contacts.softDelete(contact.id());
        audit.record(AuditActionCode.CONTACT_DEACTIVATED, ENTITY, contact.id(), Map.of());
    }

    private static ContactValues resolve(ContactRequest request) {
        String extension = ContactPhones.normalize(request.extension());
        String mobile = ContactPhones.normalize(request.mobile());
        if (extension != null && !ContactPhones.isValidExtension(extension)) {
            throw new ValidationException("The extension must have 4 digits");
        }
        if (mobile != null && !ContactPhones.isValidMobile(mobile)) {
            throw new ValidationException("The mobile must have 9 digits and start with 9");
        }
        return new ContactValues(request.fullName().strip(), extension, mobile, DirectoryText.optional(request.email()));
    }

    private List<Long> organizationIds(ContactRequest request) {
        List<String> codes = request.organizationCodesOrEmpty();
        if (codes.isEmpty()) {
            throw new BusinessRuleException("A contact must belong to at least one active organization");
        }
        return codes.stream().map(active::organization).map(OrganizationRow::id).toList();
    }

    /**
     * El rol de cada vínculo del alta o la edición (D-08b): las claves de
     * {@code roles} deben ser organizaciones del mismo cuerpo; el valor vacío
     * significa sin rol. Una clave desconocida es una petición mal armada.
     */
    private Map<Long, String> linkRoles(ContactRequest request, List<Long> organizationIds) {
        Map<String, String> roles = request.roles();
        if (roles == null || roles.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> byId = new HashMap<>();
        for (Map.Entry<String, String> entry : roles.entrySet()) {
            String code = entry.getKey() == null ? null : entry.getKey().strip();
            if (code == null || code.isEmpty()) {
                throw new ValidationException("Each role must name the organization it belongs to");
            }
            if (!request.organizationCodesOrEmpty().contains(code)) {
                throw new ValidationException("The roles can only name organizations in the request");
            }
            String role = linkRole(entry.getValue());
            if (role != null) {
                byId.put(active.organization(code).id(), role);
            }
        }
        return byId;
    }

    /** Un rol sin espacios que valga; vacío es sin rol, y más largo que la columna, rechazo. */
    private static String linkRole(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String role = raw.strip();
        if (role.length() > MAX_ROLE) {
            throw new ValidationException("The role cannot exceed " + MAX_ROLE + " characters");
        }
        return role;
    }

    private static List<String> changedFields(ContactRow current, ContactValues values) {
        List<String> changed = new ArrayList<>();
        DirectoryText.addIfChanged(changed, "fullName", current.fullName(), values.fullName());
        DirectoryText.addIfChanged(changed, "extension", current.extension(), values.extension());
        DirectoryText.addIfChanged(changed, "mobile", current.mobile(), values.mobile());
        DirectoryText.addIfChanged(changed, "email", current.email(), values.email());
        return changed;
    }
}
