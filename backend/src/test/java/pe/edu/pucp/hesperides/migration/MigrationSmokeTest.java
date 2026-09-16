package pe.edu.pucp.hesperides.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Verifica que Flyway aplica todas las migraciones y deja el esquema esperado. */
@Testcontainers
@SpringBootTest
class MigrationSmokeTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
                String.class);

        // Exacto y no "contiene": una columna que ningún spec declara es tan
        // sospechosa como una que falta. Las tres últimas las añade V006
        // (SPEC-100); las once primeras son de V002 (SPEC-001).
        assertThat(columns).containsExactlyInAnyOrder(
                "id", "email", "password_hash", "first_name", "last_name",
                "role_item_id", "is_active", "last_login",
                "created_at", "updated_at", "deleted_at",
                "credential_status", "must_change_password", "credentials_sent_at");
    }

    @Test
    void refreshTokensTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'refresh_tokens'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "user_id", "token_hash", "issued_at", "expires_at",
                "revoked_at", "replaced_by_id", "client_type", "user_agent",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void emailIsUniqueOnlyAmongLiveRows() {
        jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, deleted_at)
                VALUES ('repetido@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
                        CURRENT_TIMESTAMP)
                """);

        // El mismo correo vuelve a estar libre porque la fila anterior está dada de baja.
        jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES ('repetido@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'))
                """);

        Integer live = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = 'repetido@pucp.edu.pe' AND deleted_at IS NULL",
                Integer.class);
        assertThat(live).isEqualTo(1);
    }

    @Test
    void roleCatalogHasTheFourRealRolesActive() {
        List<String> codes = jdbcTemplate.queryForList("""
                SELECT ci.code FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.is_active = TRUE
                """, String.class);

        assertThat(codes).containsExactlyInAnyOrder(
                "ADMIN", "COORDINADOR", "SUPERVISOR", "OPERARIO");
    }

    @Test
    void genericUserRoleFromTheFirstMigrationIsDeactivatedNotDeleted() {
        Boolean active = jdbcTemplate.queryForObject("""
                SELECT ci.is_active FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.code = 'USER'
                """, Boolean.class);

        assertThat(active).isFalse();
    }

    @Test
    void credentialStatusRejectsAnyValueOutsideTheTwoAllowed() {
        assertThatThrownBy(() -> jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, credential_status)
                VALUES ('check@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
                        'ESTADO_INVENTADO')
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void existingAccountsDefaultToDeliveredAndNotForcedToChangePassword() {
        // El administrador semilla no paso por el flujo de envio: marcarlo como
        // pendiente o forzarle el cambio seria describir mal lo que ya existe.
        Map<String, Object> admin = jdbcTemplate.queryForMap(
                "SELECT credential_status, must_change_password FROM users WHERE email = 'admin@pucp.edu.pe'");

        assertThat(admin.get("credential_status")).isEqualTo("DELIVERED");
        assertThat(admin.get("must_change_password")).isEqualTo(false);
    }

    @Test
    void teamsAndTeamMembersExistWithTheColumnsSpec002Declares() {
        List<String> teams = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'",
                String.class);
        assertThat(teams).containsExactlyInAnyOrder(
                "id", "code", "name", "supervisor_user_id", "zone_id", "is_active",
                "created_at", "updated_at", "deleted_at");

        List<String> members = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_members'",
                String.class);
        assertThat(members).containsExactlyInAnyOrder(
                "id", "team_id", "user_id", "joined_at", "left_at",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void aUserCannotBeActiveTwiceInTheSameTeam() {
        Long adminId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'admin@pucp.edu.pe'", Long.class);
        jdbcTemplate.update(
                "INSERT INTO teams (code, name, supervisor_user_id) VALUES ('CN-01', 'Cuadrilla Norte', ?)",
                adminId);
        Long teamId = jdbcTemplate.queryForObject(
                "SELECT id FROM teams WHERE code = 'CN-01'", Long.class);

        jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, adminId);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, adminId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ─── SPEC-005 §4.1-4.2 · Taxonomía de intervenciones ────────────────────

    @Test
    void catalogItemsAcceptsTwoLevelHierarchy() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'catalog_items'",
                String.class);
        assertThat(columns).contains("parent_item_id");
    }

    @Test
    void anItemCannotBeItsOwnParent() {
        Long anyItemId = jdbcTemplate.queryForObject("""
                SELECT ci.id FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'
                """, Long.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE catalog_items SET parent_item_id = ? WHERE id = ?", anyItemId, anyItemId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theNineRealInterventionClassesAreSeeded() {
        List<String> codes = jdbcTemplate.queryForList("""
                SELECT ci.code FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_CLASS' AND ci.is_active = TRUE
                ORDER BY ci.sort_order
                """, String.class);

        assertThat(codes).containsExactly(
                "HABILITACION", "REHABILITACION", "MANTENIMIENTO", "PODA", "PROPAGACION",
                "RIEGO", "FITOSANITARIO", "RESIDUOS", "INSPECCION");
    }

    @Test
    void everyInterventionTypeIsSeeded() {
        // 45 confirmados por el Excel del cliente + 7 preliminares de las dos
        // clases que el cliente aun no ha desglosado (V010).
        Integer total = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.is_active = TRUE
                """, Integer.class);

        assertThat(total).isEqualTo(52);
    }

    @Test
    void theTypesConfirmedByTheClientAreExactlyFortyFive() {
        // Los preliminares se distinguen por metadata->>'provisional'. Si el
        // cliente entrega su desglose, los suyos entran sin ese flag y este
        // conteo no cambia.
        Integer confirmados = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.is_active = TRUE
                  AND COALESCE(ci.metadata->>'provisional', 'false') <> 'true'
                """, Integer.class);

        assertThat(confirmados).isEqualTo(45);
    }

    @Test
    void everyProvisionalTypeIsFlaggedAndBelongsToAnUndisclosedClass() {
        // El flag es lo que hace barata la reversion: una sola consulta los
        // encuentra a todos cuando llegue el dato real (P-10).
        List<String> clases = jdbcTemplate.queryForList("""
                SELECT DISTINCT padre.code FROM catalog_items hijo
                JOIN catalog_types ct    ON ct.id = hijo.catalog_type_id
                JOIN catalog_items padre ON padre.id = hijo.parent_item_id
                WHERE ct.code = 'INTERVENTION_TYPE'
                  AND hijo.metadata->>'provisional' = 'true'
                """, String.class);

        assertThat(clases).containsExactlyInAnyOrder("FITOSANITARIO", "INSPECCION");
    }

    @Test
    void theInventedTypesFromSpec002WereNeverSeeded() {
        // V010 no llegó a escribirse, así que DECORACION y REMOCION_TERRENO no
        // existen en ningún estado. CA-03 de SPEC-005 pide que estén inactivos;
        // no haberlos sembrado nunca satisface el fondo del criterio.
        Integer invented = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE'
                  AND ci.code IN ('DECORACION', 'REMOCION_TERRENO')
                """, Integer.class);

        assertThat(invented).isZero();
    }

    @Test
    void everyInterventionTypeHangsFromAClass() {
        Integer orphans = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.parent_item_id IS NULL
                """, Integer.class);
        assertThat(orphans).isZero();

        // El padre siempre es una clase, nunca otro tipo: la jerarquía es de dos
        // niveles y la base no puede expresar esa regla en un CHECK.
        Integer wrongParentType = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items hijo
                JOIN catalog_types t_hijo  ON t_hijo.id  = hijo.catalog_type_id
                JOIN catalog_items padre   ON padre.id   = hijo.parent_item_id
                JOIN catalog_types t_padre ON t_padre.id = padre.catalog_type_id
                WHERE t_hijo.code = 'INTERVENTION_TYPE'
                  AND t_padre.code <> 'INTERVENTION_CLASS'
                """, Integer.class);
        assertThat(wrongParentType).isZero();
    }

    @Test
    void canteoHangsFromMaintenance() {
        String parentCode = jdbcTemplate.queryForObject("""
                SELECT padre.code FROM catalog_items hijo
                JOIN catalog_types ct    ON ct.id = hijo.catalog_type_id
                JOIN catalog_items padre ON padre.id = hijo.parent_item_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND hijo.code = 'CANTEO'
                """, String.class);

        assertThat(parentCode).isEqualTo("MANTENIMIENTO");
    }

    @Test
    void eachClassHasTheNumberOfTypesTheClientMaterialDeclares() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT padre.code AS clase, COUNT(hijo.id) AS tipos
                  FROM catalog_items padre
                  JOIN catalog_types ct ON ct.id = padre.catalog_type_id
                  LEFT JOIN catalog_items hijo ON hijo.parent_item_id = padre.id
                 WHERE ct.code = 'INTERVENTION_CLASS'
                 GROUP BY padre.code
                """);

        Map<String, Long> porClase = rows.stream().collect(java.util.stream.Collectors.toMap(
                r -> (String) r.get("clase"), r -> (Long) r.get("tipos")));

        assertThat(porClase).containsOnly(
                entry("HABILITACION", 6L), entry("REHABILITACION", 7L),
                entry("MANTENIMIENTO", 10L), entry("PODA", 4L),
                entry("PROPAGACION", 10L), entry("RIEGO", 4L),
                entry("RESIDUOS", 4L),
                // Preliminares de V010: el cliente aún no ha desglosado estas dos.
                entry("FITOSANITARIO", 4L), entry("INSPECCION", 3L));
    }

    @Test
    void noClassIsLeftWithoutTypes() {
        // Con los preliminares de V010, las nueve clases tienen al menos un tipo:
        // el formulario ya no deja al operario sin opciones en ninguna.
        List<String> huerfanas = jdbcTemplate.queryForList("""
                SELECT padre.code FROM catalog_items padre
                JOIN catalog_types ct ON ct.id = padre.catalog_type_id
                WHERE ct.code = 'INTERVENTION_CLASS'
                  AND NOT EXISTS (SELECT 1 FROM catalog_items hijo
                                   WHERE hijo.parent_item_id = padre.id)
                """, String.class);

        assertThat(huerfanas).isEmpty();
    }

    @Test
    void everyClassCarriesTheDescriptionTheClientWrote() {
        // A diferencia de las de los tipos, estas nueve son textuales del Excel
        // DAF-OSG: no hay ninguna redactada por nosotros.
        Integer sinDescripcion = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_CLASS'
                  AND COALESCE(ci.metadata->>'description', '') = ''
                """, Integer.class);

        assertThat(sinDescripcion).isZero();
    }

    @Test
    void theClassDescriptionIsTheOneTheClientWrote() {
        String fitosanitario = jdbcTemplate.queryForObject("""
                SELECT ci.metadata->>'description' FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'
                """, String.class);

        assertThat(fitosanitario).isEqualTo("Prevención y control de plagas y enfermedades");
    }

    @Test
    void addingTheDescriptionKeepsWhatTheClassAlreadyHad() {
        // El merge de JSONB no debe pisar responsible_group ni priority: son el
        // vinculo con las cuadrillas y el orden de construccion del equipo.
        Map<String, Object> poda = jdbcTemplate.queryForMap("""
                SELECT ci.metadata->>'description'       AS descripcion,
                       ci.metadata->>'responsible_group' AS grupo,
                       ci.metadata->>'priority'          AS prioridad
                  FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'
                """);

        assertThat(poda.get("descripcion"))
                .isEqualTo("Corte y manejo de árboles, arbustos y otras plantas");
        assertThat(poda.get("grupo")).isEqualTo("jardineros");
        assertThat(poda.get("prioridad")).isEqualTo("true");
    }

    @Test
    void theThreePriorityClassesAreFlagged() {
        List<String> codes = jdbcTemplate.queryForList("""
                SELECT code FROM catalog_items WHERE metadata->>'priority' = 'true'
                """, String.class);

        assertThat(codes).containsExactlyInAnyOrder("PODA", "MANTENIMIENTO", "FITOSANITARIO");
    }

    @Test
    void theFlagDoesNotRestrictSelection() {
        // CA-14: la prioridad ordena el trabajo del equipo, no limita al usuario.
        // Una clase sin flag debe seguir activa y seleccionable.
        Boolean riegoActivo = jdbcTemplate.queryForObject("""
                SELECT ci.is_active FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'
                """, Boolean.class);

        assertThat(riegoActivo).isTrue();
    }

    @Test
    void everyTypeCarriesHelpTextForTheFieldOperator() {
        Integer sinDescripcion = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE'
                  AND COALESCE(ci.metadata->>'description', '') = ''
                """, Integer.class);

        assertThat(sinDescripcion).isZero();
    }

    @Test
    void theTwoDescriptionsConfirmedByTheClientAreVerbatim() {
        // Las únicas dos que constan en material del cliente (docs/dominio/README.md
        // §5.4). El resto son provisionales y se contrastarán con el Excel DAF-OSG.
        String canteo = jdbcTemplate.queryForObject("""
                SELECT ci.metadata->>'description' FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'INTERVENTION_TYPE' AND ci.code = 'CANTEO'
                """, String.class);

        assertThat(canteo).isEqualTo("Delimitar y perfilar los bordes de jardineras o macizos");
    }

    @Test
    void flatCatalogsKeepWorkingWithoutAParent() {
        // La jerarquía es opcional: un ROLE o un URGENCY_LEVEL no tiene padre.
        Integer rolesConPadre = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.parent_item_id IS NOT NULL
                """, Integer.class);

        assertThat(rolesConPadre).isZero();
    }

    // ─── V012 · Parámetros de sistema ─────────────────────────────────────

    @Test
    void systemParametersTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'system_parameters'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "code", "label", "value", "value_type", "description",
                "is_editable", "created_at", "updated_at", "deleted_at");
    }

    @Test
    void theFourOperationalParametersAreSeeded() {
        List<String> codes = jdbcTemplate.queryForList(
                "SELECT code FROM system_parameters WHERE deleted_at IS NULL ORDER BY code",
                String.class);

        assertThat(codes).containsExactly(
                "CAMPUS_TOTAL_HECTARES", "LOGIN_MAX_ATTEMPTS",
                "MAIL_FROM", "PASSWORD_MIN_LENGTH");
    }

    @Test
    void eachParameterMatchesTheTypeItClaims() {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT code, value, value_type FROM system_parameters "
                        + "WHERE code = 'PASSWORD_MIN_LENGTH'");

        assertThat(row.get("value")).isEqualTo("10");
        assertThat(row.get("value_type")).isEqualTo("INTEGER");
    }

    @Test
    void valueTypeRejectsAnyValueOutsideTheFiveSupported() {
        assertThatThrownBy(() -> jdbcTemplate.execute("""
                INSERT INTO system_parameters (code, label, value, value_type)
                VALUES ('PARAM_INVENTADO', 'Parámetro inventado', 'x', 'TIPO_INVENTADO')
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void parametersAreOnlySeededOnce() {
        Integer live = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_parameters WHERE deleted_at IS NULL",
                Integer.class);
        assertThat(live).isEqualTo(4);
    }
}
