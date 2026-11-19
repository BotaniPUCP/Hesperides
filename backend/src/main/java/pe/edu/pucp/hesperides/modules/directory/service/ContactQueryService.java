package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationRef;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.Page;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactFilter;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactReadRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactRow;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

/** Lista, parecidos y ficha de contactos. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContactQueryService {

    private final ContactRepository contacts;
    private final ContactReadRepository reads;

    public Page<ContactSummary> list(String q, String organizationCode, boolean withoutOrganization, int page, int size) {
        ContactFilter filter = new ContactFilter(LikePattern.contains(DirectoryText.optional(q)),
                DirectoryText.optional(organizationCode), withoutOrganization);
        return new Page<>(page, size, reads.count(filter), reads.page(filter, page, size));
    }

    /** De cualquier organización: así se descubre a alguien ya registrado en otra (SPEC-106 §5.2). */
    public List<ContactSummary> similar(String fullName) {
        String text = DirectoryText.optional(fullName);
        if (text == null) {
            return List.of();
        }
        return reads.similar(text, DirectoryText.SIMILARITY_THRESHOLD, DirectoryText.MAX_SUGGESTIONS);
    }

    public ContactDetail detail(String code) {
        ContactRow row = contacts.byCode(code);
        List<OrganizationRef> organizations = reads.organizations(row.id());
        boolean hasActive = organizations.stream().anyMatch(OrganizationRef::active);
        return new ContactDetail(row.code(), row.fullName(), row.extension(), row.mobile(), row.email(), row.active(),
                hasActive, organizations);
    }
}
