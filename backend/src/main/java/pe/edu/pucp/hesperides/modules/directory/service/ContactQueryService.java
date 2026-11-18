package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationRef;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactReadRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactRow;

/** Lista completa y ficha de contactos. Buscar, filtrar y los parecidos van en el navegador (SPEC-119). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContactQueryService {

    private final ContactRepository contacts;
    private final ContactReadRepository reads;

    public List<ContactSummary> all() {
        return reads.all();
    }

    public ContactDetail detail(String code) {
        ContactRow row = contacts.byCode(code);
        List<OrganizationRef> organizations = reads.organizations(row.id());
        boolean hasActive = organizations.stream().anyMatch(OrganizationRef::active);
        return new ContactDetail(row.code(), row.fullName(), row.extension(), row.mobile(), row.email(), row.active(),
                hasActive, organizations);
    }
}
