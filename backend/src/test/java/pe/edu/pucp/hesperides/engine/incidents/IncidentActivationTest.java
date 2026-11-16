package pe.edu.pucp.hesperides.engine.incidents;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static pe.edu.pucp.hesperides.engine.incidents.ActivationGap.*;

class IncidentActivationTest {

    private static ActivationFacts complete() {
        return new ActivationFacts(true, true, true, false, null, false, HeightClass.UNDER_5M);
    }

    @Test
    void completeOwnStaffIncidentHasNoGaps() {
        assertThat(IncidentActivation.gaps(complete())).isEmpty();
    }

    @Test
    void missingTypeUrgencyAndLocationAreAllReported() {
        var facts = new ActivationFacts(false, false, false, false, null, false, HeightClass.NOT_APPLICABLE);
        assertThat(IncidentActivation.gaps(facts)).containsExactly(TYPE, URGENCY, LOCATION);
    }

    @Test
    void thirdPartyNeedsOrganizationAndAgreedDaysWithinRange() {
        var noDays = new ActivationFacts(true, true, true, true, null, false, HeightClass.OVER_5M);
        assertThat(IncidentActivation.gaps(noDays)).containsExactly(PROVIDER, AGREED_DAYS);
        var tooMany = new ActivationFacts(true, true, true, true, 91, true, HeightClass.OVER_5M);
        assertThat(IncidentActivation.gaps(tooMany)).containsExactly(AGREED_DAYS);
        var ok = new ActivationFacts(true, true, true, true, 90, true, HeightClass.OVER_5M);
        assertThat(IncidentActivation.gaps(ok)).isEmpty();
    }

    @Test
    void treeOfFiveMetersOrMoreCannotBeOwnStaff() {
        var facts = new ActivationFacts(true, true, true, false, null, false, HeightClass.OVER_5M);
        assertThat(IncidentActivation.gaps(facts)).containsExactly(TALL_TREE_NEEDS_THIRD_PARTY);
    }

    @Test
    void heightClassFromCodeFailsFastOnUnknownValues() {
        assertThat(HeightClass.fromCode(null)).isEqualTo(HeightClass.NOT_APPLICABLE);
        assertThat(HeightClass.fromCode("OVER_5M")).isEqualTo(HeightClass.OVER_5M);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> HeightClass.fromCode("TALL"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
