import { MongooseModule } from '@nestjs/mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryModule } from '@utility/database/module'
import { ChangeHistoryModule } from '@utility/history/module'
import { REPOSITORY_EMPLOYEE } from '@repository/token'
import { EmployeeRepositoryMongo } from './employee'
import { EmployeeEntity, EmployeeSchema } from './schema/employee'

/**
 * Registers the employee repository under `REPOSITORY_EMPLOYEE`.
 */
export const EmployeeRepositoryModule = RepositoryModule.forFeature({
  imports: [
    MongooseModule.forFeature(
      [{ name: EmployeeEntity.name, schema: EmployeeSchema }],
      MONGO_MAIN_CONNECTION,
    ),
    ChangeHistoryModule,
  ],
  repositories: [
    { provide: REPOSITORY_EMPLOYEE, useClass: EmployeeRepositoryMongo },
  ],
})
