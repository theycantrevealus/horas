import { Module } from '@nestjs/common'
import { WorkforceModule } from '@workforce/workforce.module'
import {
  AppointmentController,
  EmployeeAppointmentController,
  GrantController,
} from './appointment.controller'

/**
 * HTTP side of group 4.3: SPKs and the privilege directory.
 */
@Module({
  imports: [WorkforceModule],
  controllers: [
    AppointmentController,
    EmployeeAppointmentController,
    GrantController,
  ],
})
export class AppointmentManagementModule {}
