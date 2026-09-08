package pe.edu.pucp.hesperides.modules.teams.repository;

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
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.Team;
import pe.edu.pucp.hesperides.modules.teams.entity.TeamMember;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class TeamsRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TeamsRepository teamsRepository;

    @Autowired
    private TeamMembersRepository teamMembersRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long insertUser(String email, String role) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES (?, 'hash', 'Juan', 'Perez',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = ?))
                """, email, role);
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    private Long newTeam(Long supervisorId, String code) {
        return teamsRepository.save(
                        TeamFixture.code(code, usersRepository.findById(supervisorId).orElseThrow()))
                .getId();
    }

    @Test
    void savesAndFindsATeamByItsActiveCode() {
        Long supervisor = insertUser("supervisor@pucp.edu.pe", "SUPERVISOR");
        Long teamId = newTeam(supervisor, "CUAD-01");

        Optional<Team> found = teamsRepository.findByCodeAndDeletedAtIsNull("CUAD-01");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(teamId);
        assertThat(found.get().getSupervisorUser().getEmail()).isEqualTo("supervisor@pucp.edu.pe");
    }

    @Test
    void codeIsReusableOnceTheTeamIsSoftDeleted() {
        Long supervisor = insertUser("supervisor2@pucp.edu.pe", "SUPERVISOR");
        Long teamId = newTeam(supervisor, "CUAD-02");

        Team team = teamsRepository.findById(teamId).orElseThrow();
        team.softDelete();
        teamsRepository.save(team);
        teamsRepository.flush();

        Long other = newTeam(supervisor, "CUAD-02");
        assertThat(teamsRepository.findById(other)).isPresent();
    }

    @Test
    void anOperarioMemberIsSeenAsCurrentUntilLeftAtIsFilled() {
        Long supervisor = insertUser("supervisor3@pucp.edu.pe", "SUPERVISOR");
        Long operario = insertUser("operario@pucp.edu.pe", "OPERARIO");
        newTeam(supervisor, "CUAD-03");
        Long teamId = teamsRepository.findByCodeAndDeletedAtIsNull("CUAD-03").orElseThrow().getId();

        TeamMember member = new TeamMember();
        member.setTeam(teamsRepository.findById(teamId).orElseThrow());
        member.setUser(usersRepository.findById(operario).orElseThrow());
        teamMembersRepository.save(member);

        assertThat(member.isCurrent()).isTrue();
        assertThat(teamMembersRepository.findByTeamIdAndUserIdAndLeftAtIsNull(teamId, operario)).isPresent();

        member.setLeftAt(java.time.Instant.now());
        teamMembersRepository.save(member);

        assertThat(member.isCurrent()).isFalse();
        assertThat(teamMembersRepository.findByTeamIdAndUserIdAndLeftAtIsNull(teamId, operario)).isEmpty();
    }

    private record TeamFixture() {
        static Team code(String code, pe.edu.pucp.hesperides.modules.auth.entity.User supervisor) {
            Team team = new Team();
            team.setCode(code);
            team.setName("Cuadrilla " + code);
            team.setSupervisorUser(supervisor);
            return team;
        }
    }
}