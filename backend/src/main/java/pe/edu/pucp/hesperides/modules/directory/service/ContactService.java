package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.ArrayList;
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
 */
@Service
@RequiredArgsConstructor
public class ContactService {

    private static final String ENTITY = "Contact";

    private final ContactRepository contacts;
    private final ActiveRecords active;
    private final AuditService audit;

    @Transactional
    public String create(ContactRequest request) {
        ContactValues values = resolve(request);
        List<Long> organizationIds = organizationIds(request);
        Created created = contacts.insert(values);
        organizationIds.forEach(organizationId -> contacts.link(created.id(), organizationId));
        audit.record(AuditActionCode.CONTACT_CREATED, ENTITY, created.id(),
                Map.of("organizations", organizationIds.size()));
        return created.code();
    }

    @Transactional
    public void update(String code, ContactRequest request) {
        ContactRow current = active.contact(code);
        ContactValues values = resolve(request);
        List<Long> organizationIds = organizationIds(request);
        List<String> changed = changedFields(current, values);
        if (!organizationIds.stream().sorted().toList().equals(contacts.organizationIds(current.id()))) {
            changed.add("organizations");
        }
        contacts.update(current.id(), values);
        contacts.replaceLinks(current.id(), organizationIds);
        audit.record(AuditActionCode.CONTACT_UPDATED, ENTITY, current.id(), Map.of("fields", changed));
    }

    /** Agrega una organización sin tocar los datos ni los demás vínculos (SPEC-106 §3.1). */
    @Transactional
    public void link(String code, String organizationCode) {
        ContactRow contact = active.contact(code);
        OrganizationRow organization = active.organization(organizationCode);
        if (contacts.organizationIds(contact.id()).contains(organization.id())) {
            throw new DuplicateResourceException("The contact " + code + " already belongs to «" + organization.name() + "»");
        }
        contacts.link(contact.id(), organization.id());
        audit.record(AuditActionCode.CONTACT_LINKED, ENTITY, contact.id(), Map.of("organization", organizationCode));
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

    private static List<String> changedFields(ContactRow current, ContactValues values) {
        List<String> changed = new ArrayList<>();
        DirectoryText.addIfChanged(changed, "fullName", current.fullName(), values.fullName());
        DirectoryText.addIfChanged(changed, "extension", current.extension(), values.extension());
        DirectoryText.addIfChanged(changed, "mobile", current.mobile(), values.mobile());
        DirectoryText.addIfChanged(changed, "email", current.email(), values.email());
        return changed;
    }
}
