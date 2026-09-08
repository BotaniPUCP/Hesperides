package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;

/**
 * Cuenta de una persona del sistema. El rol es una fila de catalog_items
 * (tipo ROLE), nunca un enum: el cliente puede añadir roles sin desplegar.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_item_id", nullable = false)
    private CatalogItem roleItem;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "last_login")
    private Instant lastLogin;

    @Enumerated(EnumType.STRING)
    @Column(name = "credential_status", nullable = false, length = 20)
    private CredentialStatus credentialStatus = CredentialStatus.DELIVERED;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @Column(name = "credentials_sent_at")
    private Instant credentialsSentAt;

    /**
     * Se compone al vuelo en vez de guardarse: los reportes necesitan el
     * apellido por separado, y un campo derivado en BD se desincroniza.
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getRoleCode() {
        return roleItem.getCode();
    }
}