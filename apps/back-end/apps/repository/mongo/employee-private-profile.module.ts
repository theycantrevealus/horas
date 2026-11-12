import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { EncryptionModule } from '@utility/encryption/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_EMPLOYEE_PRIVATE_PROFILE } from '@repository/token'
import { EmployeePrivateProfileRepositoryMongo } from './employee-private-profile'
import {
  EmployeePrivateProfileEntity,
  EmployeePrivateProfileSchema,
} from './schema/employee-private-profile'

/**
 * Registers the employee private profile repository under
 * `REPOSITORY_EMPLOYEE_PRIVATE_PROFILE`. It imports the encryption module for the field cipher.
 */
export const EmployeePrivateProfileRepositoryModule =
  RepositoryModule.forFeature({
    imports: [
      MongooseModule.forFeature(
        [
          {
            name: EmployeePrivateProfileEntity.name,
            schema: EmployeePrivateProfileSchema,
          },
        ],
        MONGO_MAIN_CONNECTION,
      ),
      ChangeHistoryModule,
      EncryptionModule,
    ],
    repositories: [
      {
        provide: REPOSITORY_EMPLOYEE_PRIVATE_PROFILE,
        useClass: EmployeePrivateProfileRepositoryMongo,
      },
    ],
  })
