package pe.edu.pucp.hesperides.modules.interventions.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.interventions.repository.InterventionReferencesRepository;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ActivityAccessTest {
    @Test void unassignedImportedWorkMayBeClaimedUntilItIsCancelled(){
        var jdbc=mock(JdbcTemplate.class);var access=new InterventionAccess(mock(InterventionReferencesRepository.class),jdbc);
        var user=mock(User.class);when(user.getId()).thenReturn(5L);when(user.getRoleCode()).thenReturn("SUPERVISOR");
        var row=new HashMap<String,Object>();row.put("responsible_supervisor_user_id",null);row.put("legacy_baseline_pending",true);row.put("code","IN_PROGRESS");
        when(jdbc.queryForList(anyString(),eq(7L))).thenReturn(List.of(row));
        assertThat(access.canRead(user,7L,null,null)).isTrue();
        row.put("code","CANCELLED");assertThat(access.canRead(user,7L,null,null)).isFalse();
        row.put("responsible_supervisor_user_id",5L);assertThat(access.canRead(user,7L,null,null)).isTrue();
    }
}
