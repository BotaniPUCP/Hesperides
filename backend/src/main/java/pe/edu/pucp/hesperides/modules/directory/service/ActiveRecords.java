package pe.edu.pucp.hesperides.modules.directory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactRow;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationRow;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/**
 * Un registro dado de baja se puede leer pero no cambiar ni usar. Un código
 * inexistente es 404; uno dado de baja, 422: existe, pero la operación no procede.
 */
@Component
@RequiredArgsConstructor
class ActiveRecords {

    private final OrganizationRepository organizations;
    private final ContactRepository contacts;

    OrganizationRow organization(String code) {
        OrganizationRow organization = organizations.byCode(code);
        if (!organization.active()) {
            throw new BusinessRuleException("The organization " + code + " is deactivated");
        }
        return organization;
    }

    ContactRow contact(String code) {
        ContactRow contact = contacts.byCode(code);
        if (!contact.active()) {
            throw new BusinessRuleException("The contact " + code + " is deactivated");
        }
        return contact;
    }
}
