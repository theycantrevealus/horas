import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_ACCOUNT_ROLE_BINDING } from '@repository/token'
import { AccountRoleBindingRepositoryMongo } from './account-role-binding'
import {
  AccountRoleBindingEntity,
  AccountRoleBindingSchema,
} from './schema/account-role-binding'

/**
 * Account role binding repository on the main Mongo connection.
 * Import it in any feature module that injects `REPOSITORY_ACCOUNT_ROLE_BINDING`.
 */
export const AccountRoleBindingRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: AccountRoleBindingEntity.name,
          schema: AccountRoleBindingSchema,
        },
      ],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    {
      provide: REPOSITORY_ACCOUNT_ROLE_BINDING,
      useClass: AccountRoleBindingRepositoryMongo,
    },
  ],
})
