package com.appsmith.server.migrations.db.ce;

import com.appsmith.external.models.Policy;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.constants.FieldName;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.QApplication;
import com.appsmith.server.repositories.ce.BaseAppsmithRepositoryCEImpl;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@ChangeUnit(order = "038", id = "add-permissions-for-git-operations", author = " ")
public class Migration038AddPermissionsForGitOpearations {

    private final MongoTemplate mongoTemplate;

    public Migration038AddPermissionsForGitOpearations(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * mandatory to declare, but we don't have a use-case for this yet.
     */
    @RollbackExecution
    public void rollbackExecution() {}

    @Execution
    public void addPermissionForGitOperationsToExistingApplications() {
        /*
         1. Get all applications in batches
         2. For each application
         3. Generate a new policy for the permission groups and permissions
         4. Add the policy to set of policies of this application
         5. Save the application
        */
        String policiesFieldPath = BaseAppsmithRepositoryCEImpl.fieldName(QApplication.application.policies);
        String idFieldPath = BaseAppsmithRepositoryCEImpl.fieldName(QApplication.application.id);

        int batchSize = 10000, updatedCount = 0, updatedCountInCurrentBatch;

        do {
            // get applications which are not deleted
            Criteria criteria = Criteria.where(FieldName.DELETED_AT).exists(false);
            Query allApplicationsInBatchQuery = Query.query(criteria).limit(batchSize);
            allApplicationsInBatchQuery.skip(updatedCount);
            allApplicationsInBatchQuery.fields().include(policiesFieldPath); // we only need the policies

            // fetch the applications with the above criteria
            List<Application> applicationList = mongoTemplate.find(allApplicationsInBatchQuery, Application.class);
            updatedCountInCurrentBatch = 0;

            for (Application application : applicationList) {
                updatedCount++;
                updatedCountInCurrentBatch++;

                Optional<Set<String>> optionalPermissionGroupsForManagePermission = application.getPolicies().stream()
                        .filter(policy -> policy.getPermission().equals(AclPermission.MANAGE_APPLICATIONS.getValue()))
                        .map(Policy::getPermissionGroups)
                        .findFirst();

                if (optionalPermissionGroupsForManagePermission.isPresent()) {
                    Set<String> managePermissionPermissionGroups = optionalPermissionGroupsForManagePermission.get();
                    addGitPoliciesToPolicySet(application.getPolicies(), managePermissionPermissionGroups);

                    Update update = new Update();
                    update.set(policiesFieldPath, application.getPolicies());

                    Query updateQuery = Query.query(Criteria.where(idFieldPath).is(application.getId()));
                    mongoTemplate.updateFirst(updateQuery, update, Application.class);
                }
            }
        } while (updatedCountInCurrentBatch == batchSize);
    }

    private void addGitPoliciesToPolicySet(Set<Policy> policies, Set<String> permissionGroups) {
        policies.add(Policy.builder()
                .permission(AclPermission.CONNECT_TO_GIT.getValue())
                .permissionGroups(permissionGroups)
                .build());

        policies.add(Policy.builder()
                .permission(AclPermission.MANAGE_DEFAULT_BRANCHES.getValue())
                .permissionGroups(permissionGroups)
                .build());

        policies.add(Policy.builder()
                .permission(AclPermission.MANAGE_PROTECTED_BRANCHES.getValue())
                .permissionGroups(permissionGroups)
                .build());

        policies.add(Policy.builder()
                .permission(AclPermission.MANAGE_AUTO_COMMIT.getValue())
                .permissionGroups(permissionGroups)
                .build());
    }
}
