package pe.edu.pucp.hesperides.modules.directory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

/** SPEC-106 de punta a punta: organizaciones, contactos, vínculos y permisos. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
class DirectoryIntegrationTest {

    private static final String ORGS = "/api/v1/directory/organizations";
    private static final String CONTACTS = "/api/v1/directory/contacts";

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            String body) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static String orgBody(String name, String type, String ruc, String... aliases) {
        String aliasList = aliases.length == 0 ? "[]" : "[\"" + String.join("\",\"", aliases) + "\"]";
        String rucValue = ruc == null ? "null" : "\"" + ruc + "\"";
        return """
                {"name":"%s","typeCode":"%s","ruc":%s,"phone":null,"aliases":%s}"""
                .formatted(name, type, rucValue, aliasList);
    }

    private String createOrg(String name, String... aliases) throws Exception {
        return codeOf(send(post(ORGS), orgBody(name, "PUCP_UNIT", null, aliases)).andExpect(status().isCreated()));
    }

    private static String contactBody(String fullName, String extension, String mobile, String... orgCodes) {
        String orgs = orgCodes.length == 0 ? "[]" : "[\"" + String.join("\",\"", orgCodes) + "\"]";
        return """
                {"fullName":"%s","organizationCodes":%s,"extension":%s,"mobile":%s,"email":null}"""
                .formatted(fullName, orgs, quoted(extension), quoted(mobile));
    }

    private static String quoted(String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    private String createContact(String fullName, String... orgCodes) throws Exception {
        return codeOf(send(post(CONTACTS), contactBody(fullName, null, null, orgCodes)).andExpect(status().isCreated()));
    }

    private static String codeOf(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.code");
    }

    @Nested
    class Organizations {

        @Test
        void aCoordinatorRegistersAnOrganizationAndFindsItInTheList() throws Exception {
            String code = createOrg("Facultad de Derecho");

            mockMvc.perform(get(ORGS).param("q", "derecho")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.items[*].code", contains(code)))
                    .andExpect(jsonPath("$.data.items[0].type.code").value("PUCP_UNIT"))
                    .andExpect(jsonPath("$.data.total").value(1));
        }

        @Test
        void codesAreReadable() throws Exception {
            assertThat(createOrg("Facultad de Derecho")).matches("ORG-\\d{4}");
        }

        @Test
        void theSameNameWithoutAccentsOrCapitalsIsADuplicate() throws Exception {
            createOrg("Estudios Generales Ciencias");

            send(post(ORGS), orgBody("estudios generales ciéncias", "PUCP_UNIT", null)).andExpect(status().isConflict());
        }

        @Test
        void anAliasEqualToAnotherOrganizationsNameIsADuplicate() throws Exception {
            createOrg("Estudios Generales Ciencias");

            send(post(ORGS), orgBody("EEGGCC Admisión", "PUCP_UNIT", null, "Estudios Generales Ciencias"))
                    .andExpect(status().isConflict());
        }

        @Test
        void aNameEqualToAnotherOrganizationsAliasIsADuplicate() throws Exception {
            createOrg("Estudios Generales Ciencias", "EEGGCC");

            send(post(ORGS), orgBody("eeggcc", "PUCP_UNIT", null)).andExpect(status().isConflict());
        }

        @Test
        void aDeactivatedOrganizationFreesItsName() throws Exception {
            String code = createOrg("Facultad de Derecho");
            mockMvc.perform(delete(ORGS + "/" + code)).andExpect(status().isOk());

            createOrg("Facultad de Derecho");
        }

        @Test
        void theSearchFindsAnOrganizationByItsAlias() throws Exception {
            String code = createOrg("Estudios Generales Ciencias", "EEGGCC");

            mockMvc.perform(get(ORGS).param("q", "eeggcc"))
                    .andExpect(jsonPath("$.data.items[*].code", contains(code)));
        }

        @Test
        void similarNamesAreSuggestedBeforeCreating() throws Exception {
            String code = createOrg("Estudios Generales Ciencias");

            mockMvc.perform(get(ORGS + "/similar").param("name", "estudios generales ciencia"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[*].code", hasItem(code)));
        }

        @Test
        void theDetailShowsAliasesAndContacts() throws Exception {
            String org = createOrg("CF Psicología", "Centro Federado de Psicología");
            String contact = createContact("Juan Diego Villasante", org);

            mockMvc.perform(get(ORGS + "/" + org)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("CF Psicología"))
                    .andExpect(jsonPath("$.data.active").value(true))
                    .andExpect(jsonPath("$.data.aliases", contains("Centro Federado de Psicología")))
                    .andExpect(jsonPath("$.data.contacts[*].code", contains(contact)));
        }

        @Test
        void anEditReplacesNameAndAliases() throws Exception {
            String code = createOrg("Facultad de Derecho", "Derecho");

            send(put(ORGS + "/" + code), orgBody("Facultad de Derecho PUCP", "PUCP_UNIT", null, "FD"))
                    .andExpect(status().isOk());

            mockMvc.perform(get(ORGS + "/" + code))
                    .andExpect(jsonPath("$.data.name").value("Facultad de Derecho PUCP"))
                    .andExpect(jsonPath("$.data.aliases", contains("FD")));
        }

        @Test
        void editingKeepsItsOwnNameWithoutCallingItADuplicate() throws Exception {
            String code = createOrg("Facultad de Derecho", "Derecho");

            send(put(ORGS + "/" + code), orgBody("Facultad de Derecho", "PUCP_UNIT", null, "Derecho"))
                    .andExpect(status().isOk());
        }

        @Test
        void aDeactivatedOrganizationLeavesTheListButKeepsItsDetail() throws Exception {
            String code = createOrg("Facultad de Derecho");
            mockMvc.perform(delete(ORGS + "/" + code)).andExpect(status().isOk());

            mockMvc.perform(get(ORGS).param("q", "derecho")).andExpect(jsonPath("$.data.items", hasSize(0)));
            mockMvc.perform(get(ORGS + "/" + code)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.active").value(false));
        }

        @Test
        void anUnknownCodeIsNotFound() throws Exception {
            mockMvc.perform(get(ORGS + "/ORG-9999")).andExpect(status().isNotFound());
        }

        @Test
        void aBlankNameIsRejected() throws Exception {
            send(post(ORGS), orgBody(" ", "PUCP_UNIT", null)).andExpect(status().isBadRequest());
        }

        @Test
        void anUnknownTypeIsRejected() throws Exception {
            send(post(ORGS), orgBody("Facultad de Derecho", "SECRET", null)).andExpect(status().isBadRequest());
        }

        @Test
        void theListFiltersByType() throws Exception {
            createOrg("Facultad de Derecho");
            String company = codeOf(send(post(ORGS), orgBody("Jardines del Sur SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isCreated()));

            mockMvc.perform(get(ORGS).param("typeCode", "EXTERNAL_COMPANY"))
                    .andExpect(jsonPath("$.data.items[*].code", contains(company)));
        }
    }

    @Nested
    class Ruc {

        @Test
        void aCompanyKeepsItsRuc() throws Exception {
            String code = codeOf(send(post(ORGS), orgBody("Jardines del Sur SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isCreated()));

            mockMvc.perform(get(ORGS + "/" + code)).andExpect(jsonPath("$.data.ruc").value("20123456789"));
        }

        @Test
        void aPucpUnitCannotHaveARuc() throws Exception {
            send(post(ORGS), orgBody("Facultad de Derecho", "PUCP_UNIT", "20123456789"))
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void aMalformedRucIsRejected() throws Exception {
            send(post(ORGS), orgBody("Jardines del Sur SAC", "EXTERNAL_COMPANY", "2012345678"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void aRucUsedByAnotherActiveOrganizationIsADuplicate() throws Exception {
            send(post(ORGS), orgBody("Jardines del Sur SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isCreated());

            send(post(ORGS), orgBody("Jardines del Norte SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isConflict());
        }

        @Test
        void theRucOfADeactivatedCompanyCanBeReused() throws Exception {
            String code = codeOf(send(post(ORGS), orgBody("Jardines del Sur SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isCreated()));
            mockMvc.perform(delete(ORGS + "/" + code)).andExpect(status().isOk());

            send(post(ORGS), orgBody("Jardines del Norte SAC", "EXTERNAL_COMPANY", "20123456789"))
                    .andExpect(status().isCreated());
        }
    }

    @Nested
    class Contacts {

        @Test
        void aContactInTwoOrganizationsAppearsInBoth() throws Exception {
            String oie = createOrg("OIE");
            String psicologia = createOrg("CF Psicología");
            String contact = createContact("Juan Diego Villasante", oie, psicologia);

            mockMvc.perform(get(ORGS + "/" + oie)).andExpect(jsonPath("$.data.contacts[*].code", contains(contact)));
            mockMvc.perform(get(ORGS + "/" + psicologia)).andExpect(jsonPath("$.data.contacts[*].code", contains(contact)));
            mockMvc.perform(get(CONTACTS + "/" + contact)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.organizations[*].code", containsInAnyOrder(oie, psicologia)));
        }

        @Test
        void aContactNeedsAnOrganization() throws Exception {
            send(post(CONTACTS), contactBody("Juan Diego Villasante", null, null)).andExpect(status().isUnprocessableEntity());
        }

        @Test
        void aContactCannotJoinADeactivatedOrganization() throws Exception {
            String org = createOrg("OIE");
            mockMvc.perform(delete(ORGS + "/" + org)).andExpect(status().isOk());

            send(post(CONTACTS), contactBody("Juan Diego Villasante", null, null, org))
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void phonesAreNormalizedBeforeValidating() throws Exception {
            String org = createOrg("OIE");
            String contact = codeOf(send(post(CONTACTS), contactBody("Juan Diego Villasante", "45 49", "987 654-321", org))
                    .andExpect(status().isCreated()));

            mockMvc.perform(get(CONTACTS + "/" + contact))
                    .andExpect(jsonPath("$.data.extension").value("4549"))
                    .andExpect(jsonPath("$.data.mobile").value("987654321"));
        }

        @Test
        void aMalformedMobileIsRejected() throws Exception {
            String org = createOrg("OIE");

            send(post(CONTACTS), contactBody("Juan Diego Villasante", null, "887654321", org))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void aMalformedExtensionIsRejected() throws Exception {
            String org = createOrg("OIE");

            send(post(CONTACTS), contactBody("Juan Diego Villasante", "454", null, org)).andExpect(status().isBadRequest());
        }

        @Test
        void aMalformedEmailIsRejected() throws Exception {
            String org = createOrg("OIE");

            send(post(CONTACTS), """
                    {"fullName":"Juan Diego","organizationCodes":["%s"],"email":"no-es-correo"}""".formatted(org))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void twoPeopleMayShareAName() throws Exception {
            String org = createOrg("OIE");
            createContact("Juan Pérez", org);

            createContact("Juan Pérez", org);
        }

        @Test
        void theListFiltersByOrganization() throws Exception {
            String oie = createOrg("OIE");
            String daf = createOrg("DAF");
            String inOie = createContact("Juan Diego Villasante", oie);
            createContact("Ana Torres", daf);

            mockMvc.perform(get(CONTACTS).param("organizationCode", oie))
                    .andExpect(jsonPath("$.data.items[*].code", contains(inOie)));
        }

        @Test
        void theListSearchesAcrossOrganizations() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));

            mockMvc.perform(get(CONTACTS).param("q", "villasante"))
                    .andExpect(jsonPath("$.data.items[*].code", contains(contact)))
                    .andExpect(jsonPath("$.data.items[0].organizations[0].name").value("OIE"));
        }

        @Test
        void similarContactsComeFromAnyOrganization() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));

            mockMvc.perform(get(CONTACTS + "/similar").param("fullName", "juan diego villasante"))
                    .andExpect(jsonPath("$.data[*].code", hasItem(contact)));
        }

        @Test
        void aContactWhoseOnlyOrganizationLeavesStaysActiveAndIsFlagged() throws Exception {
            String org = createOrg("OIE");
            String contact = createContact("Juan Diego Villasante", org);
            mockMvc.perform(delete(ORGS + "/" + org)).andExpect(status().isOk());

            mockMvc.perform(get(CONTACTS + "/" + contact)).andExpect(jsonPath("$.data.active").value(true))
                    .andExpect(jsonPath("$.data.hasActiveOrganization").value(false));
            mockMvc.perform(get(CONTACTS).param("withoutOrganization", "true"))
                    .andExpect(jsonPath("$.data.items[*].code", contains(contact)));
        }

        @Test
        void anEditReplacesDataAndOrganizations() throws Exception {
            String oie = createOrg("OIE");
            String daf = createOrg("DAF");
            String contact = createContact("Juan Diego Villasante", oie);

            send(put(CONTACTS + "/" + contact), contactBody("Juan Diego Villasante Ríos", "4549", null, daf))
                    .andExpect(status().isOk());

            mockMvc.perform(get(CONTACTS + "/" + contact))
                    .andExpect(jsonPath("$.data.fullName").value("Juan Diego Villasante Ríos"))
                    .andExpect(jsonPath("$.data.organizations[*].code", contains(daf)));
        }

        @Test
        void aDeactivatedContactLeavesTheList() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));
            mockMvc.perform(delete(CONTACTS + "/" + contact)).andExpect(status().isOk());

            mockMvc.perform(get(CONTACTS).param("q", "villasante")).andExpect(jsonPath("$.data.items", hasSize(0)));
            mockMvc.perform(get(CONTACTS + "/" + contact)).andExpect(jsonPath("$.data.active").value(false));
        }
    }

    @Nested
    class Linking {

        @Test
        void linkingAddsTheOrganizationAndKeepsTheRest() throws Exception {
            String oie = createOrg("OIE");
            String psicologia = createOrg("CF Psicología");
            String contact = codeOf(send(post(CONTACTS), contactBody("Juan Diego Villasante", "4549", null, oie))
                    .andExpect(status().isCreated()));

            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + psicologia + "\"}")
                    .andExpect(status().isOk());

            mockMvc.perform(get(CONTACTS + "/" + contact))
                    .andExpect(jsonPath("$.data.organizations[*].code", containsInAnyOrder(oie, psicologia)))
                    .andExpect(jsonPath("$.data.extension").value("4549"));
        }

        @Test
        void linkingTwiceIsADuplicate() throws Exception {
            String oie = createOrg("OIE");
            String contact = createContact("Juan Diego Villasante", oie);

            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + oie + "\"}")
                    .andExpect(status().isConflict());
        }

        @Test
        void linkingToADeactivatedOrganizationIsRejected() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));
            String daf = createOrg("DAF");
            mockMvc.perform(delete(ORGS + "/" + daf)).andExpect(status().isOk());

            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + daf + "\"}")
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void aDeactivatedContactCannotBeLinked() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));
            String daf = createOrg("DAF");
            mockMvc.perform(delete(CONTACTS + "/" + contact)).andExpect(status().isOk());

            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + daf + "\"}")
                    .andExpect(status().isUnprocessableEntity());
        }
    }

    @Nested
    @ExtendWith(OutputCaptureExtension.class)
    class PersonalData {

        @Test
        void noLogRepeatsAContactsNamePhonesOrEmail(CapturedOutput output) throws Exception {
            String oie = createOrg("OIE");
            String daf = createOrg("DAF");
            String contact = codeOf(send(post(CONTACTS), """
                    {"fullName":"Xiomara Torres","organizationCodes":["%s"],"extension":"4549","mobile":"987654321",
                     "email":"xtorres@pucp.edu.pe"}""".formatted(oie)).andExpect(status().isCreated()));
            send(put(CONTACTS + "/" + contact), """
                    {"fullName":"Xiomara Torres Ruiz","organizationCodes":["%s"],"extension":"4550","mobile":"987654322",
                     "email":"xtorres2@pucp.edu.pe"}""".formatted(oie)).andExpect(status().isOk());
            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + daf + "\"}")
                    .andExpect(status().isOk());
            send(post(CONTACTS + "/" + contact + "/organizations"), "{\"organizationCode\":\"" + daf + "\"}")
                    .andExpect(status().isConflict());
            mockMvc.perform(delete(CONTACTS + "/" + contact)).andExpect(status().isOk());

            assertThat(output.getAll()).contains("CONTACT_UPDATED")
                    .doesNotContain("Xiomara", "4549", "4550", "987654321", "987654322", "xtorres");
        }
    }

    @Nested
    class Permissions {

        @Test
        @WithMockUser(username = "capataz@pucp.edu.pe", authorities = "SUPERVISOR")
        void aForemanReadsTheDirectory() throws Exception {
            mockMvc.perform(get(ORGS)).andExpect(status().isOk());
            mockMvc.perform(get(CONTACTS)).andExpect(status().isOk());
        }

        @Test
        @WithMockUser(username = "capataz@pucp.edu.pe", authorities = "SUPERVISOR")
        void aForemanCannotWriteNorAskForSimilarNames() throws Exception {
            send(post(ORGS), orgBody("Facultad de Derecho", "PUCP_UNIT", null)).andExpect(status().isForbidden());
            send(put(ORGS + "/ORG-0001"), orgBody("Facultad de Derecho", "PUCP_UNIT", null)).andExpect(status().isForbidden());
            mockMvc.perform(delete(ORGS + "/ORG-0001")).andExpect(status().isForbidden());
            mockMvc.perform(get(ORGS + "/similar").param("name", "derecho")).andExpect(status().isForbidden());
            send(post(CONTACTS), contactBody("Juan", null, null, "ORG-0001")).andExpect(status().isForbidden());
            send(put(CONTACTS + "/CON-0001"), contactBody("Juan", null, null, "ORG-0001")).andExpect(status().isForbidden());
            mockMvc.perform(delete(CONTACTS + "/CON-0001")).andExpect(status().isForbidden());
            mockMvc.perform(get(CONTACTS + "/similar").param("fullName", "juan")).andExpect(status().isForbidden());
            send(post(CONTACTS + "/CON-0001/organizations"), "{\"organizationCode\":\"ORG-0001\"}")
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
        void anOperatorHasNoAccess() throws Exception {
            mockMvc.perform(get(ORGS)).andExpect(status().isForbidden());
            mockMvc.perform(get(CONTACTS)).andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
        void anAdminWrites() throws Exception {
            createOrg("Facultad de Derecho");
        }

        @Test
        void aCoordinatorDeactivatesAContact() throws Exception {
            String contact = createContact("Juan Diego Villasante", createOrg("OIE"));

            mockMvc.perform(delete(CONTACTS + "/" + contact)).andExpect(status().isOk());
            mockMvc.perform(get(CONTACTS).param("q", "juan")).andExpect(jsonPath("$.data.items[*].code", not(hasItem(contact))));
        }
    }
}
