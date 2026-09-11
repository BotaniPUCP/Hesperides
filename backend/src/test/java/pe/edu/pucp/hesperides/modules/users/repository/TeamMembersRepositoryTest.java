package pe.edu.pucp.hesperides.modules.users.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class TeamMembersRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TeamMembersRepository teamMembersRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long supervisorId;
    private Long operarioId;
    private Long teamId;

    @BeforeEach
    void seed() {
        supervisorId = insertUser("supervisor@pucp.edu.pe", "SUPERVISOR");
        operarioId = insertUser("operario@pucp.edu.pe", "OPERARIO");

        jdbcTemplate.update(
                "INSERT INTO teams (code, name, supervisor_user_id) VALUES ('CN-01', 'Cuadrilla Norte', ?)",
                supervisorId);
        teamId = jdbcTemplate.queryForObject("SELECT id FROM teams WHERE code = 'CN-01'", Long.class);
    }

    private Long insertUser(String email, String roleCode) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES (?, 'hash', 'Nombre', 'Apellido',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = ?))
                """, email, roleCode);
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    @Test
    void findsTheTeamsAUserCurrentlyBelongsTo() {
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, operarioId);

        List<Team> teams = teamMembersRepository.findActiveTeamsOfUser(operarioId);

        assertThat(teams).hasSize(1);
        assertThat(teams.get(0).getCode()).isEqualTo("CN-01");
        assertThat(teams.get(0).getName()).isEqualTo("Cuadrilla Norte");
    }

    @Test
    void ignoresMembershipsAlreadyEnded() {
        // left_at poblado: la persona estuvo en la cuadrilla pero ya no esta. La
        // fila se conserva para no falsear a que equipo pertenecia cuando ejecuto
        // una intervencion antigua (SPEC-002 §4.10).
        jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id, left_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                teamId, operarioId);

        assertThat(teamMembersRepository.findActiveTeamsOfUser(operarioId)).isEmpty();
    }

    @Test
    void returnsEmptyForSomeoneWithoutAnyTeam() {
        assertThat(teamMembersRepository.findActiveTeamsOfUser(supervisorId)).isEmpty();
    }

    @Test
    void findsTheActiveMembersOfSeveralTeamsAtOnce() {
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, operarioId);
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, supervisorId);

        List<Long> memberIds = teamMembersRepository.findActiveUserIdsOfTeams(List.of(teamId));

        assertThat(memberIds).containsExactlyInAnyOrder(operarioId, supervisorId);
    }

    @Test
    void anEmptyListOfTeamsYieldsNoMembers() {
        // El SUPERVISOR sin cuadrilla asignada no debe ver a todo el mundo por
        // un IN () vacio mal construido: debe ver a nadie.
        assertThat(teamMembersRepository.findActiveUserIdsOfTeams(List.of())).isEmpty();
    }
}
