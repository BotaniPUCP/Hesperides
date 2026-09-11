package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;

/**
 * Las dos reglas que impiden que el sistema quede inutilizable. No están en
 * UsersServiceImpl para no mezclar orquestación con invariantes de seguridad, y
 * porque ambas se comprueban desde dos operaciones distintas (deactivate y
 * update).
 */
@Component
@RequiredArgsConstructor
public class AdminProtectionRules {

    private final UsersRepository usersRepository;

    /**
     * Sin esta regla, el único administrador puede dejarse fuera con un clic y la
     * recuperación exige un UPDATE manual en la base de datos.
     */
    public void refuseSelfDeactivation(User target, User actor) {
        if (target.getId().equals(actor.getId())) {
            throw new BusinessRuleException("You cannot deactivate your own account");
        }
    }

    /**
     * El conteo toma bloqueo pesimista: dos administradores desactivándose en el
     * mismo instante leerían ambos "hay otro" y el sistema quedaría sin ninguno
     * (SPEC-100 §5.6).
     */
    public void refuseRemovingLastAdmin(User target, String message) {
        if (!RoleCodes.ADMIN.equals(target.getRoleCode())) {
            return;
        }
        if (usersRepository.findOtherActiveAdminIdsForUpdate(target.getId()).isEmpty()) {
            throw new BusinessRuleException(message);
        }
    }
}
