import { Controller, Get, Param, Query } from '@nestjs/common'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import {
  AppointmentService,
  type AppointmentWithGrants,
} from '@workforce/appointment/appointment.service'
import { GrantService } from '@workforce/appointment/grant.service'
import {
  ListAppointmentsDto,
  ListGrantsDto,
  PagingDto,
} from './appointment.dto'

/**
 * Clinical appointments (SPK) of the signed-in user's tenant.
 */
@Controller({ path: 'clinical-appointments', version: '1' })
export class AppointmentController {
  /**
   * @param appointments - Appointment service.
   */
  constructor(private readonly appointments: AppointmentService) {}

  /**
   * Handles `GET /v1/clinical-appointments`: lists SPKs by status, practitioner, place or end of
   * validity.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging.
   * @returns The appointments, the soonest end of validity first.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAppointmentsDto,
  ): Promise<ClinicalAppointment[]> {
    return this.appointments.list(user.tenant_id, {
      status: query.status,
      employeeId: query.employeeId,
      facilityId: query.facilityId,
      unitId: query.unitId,
      expiringInDays: query.expiringInDays,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `GET /v1/clinical-appointments/:id`: one SPK with its grants (the RKK).
   *
   * @param user - Signed-in user.
   * @param id - Appointment identifier.
   * @returns The appointment and its grants.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppointmentWithGrants> {
    return this.appointments.get(user.tenant_id, id)
  }
}

/**
 * The SPKs of one employee of the signed-in user's tenant.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeAppointmentController {
  /**
   * @param appointments - Appointment service.
   */
  constructor(private readonly appointments: AppointmentService) {}

  /**
   * Handles `GET /v1/employees/:id/clinical-appointments`: one practitioner's SPKs.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param query - Optional paging.
   * @returns The appointments, the newest start of validity first.
   */
  @Get(':id/clinical-appointments')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CLINICAL_APPOINTMENT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: PagingDto,
  ): Promise<ClinicalAppointment[]> {
    return this.appointments.listByEmployee(user.tenant_id, id, {
      limit: query.limit,
      offset: query.offset,
    })
  }
}

/**
 * The privilege directory of the signed-in user's tenant.
 */
@Controller({ path: 'privilege-grants', version: '1' })
export class GrantController {
  /**
   * @param grants - Grant service.
   */
  constructor(private readonly grants: GrantService) {}

  /**
   * Handles `GET /v1/privilege-grants`: who holds a privilege, with which condition.
   *
   * @param user - Signed-in user.
   * @param query - Optional filters and paging; only active grants unless a status is given.
   * @returns The grants, ordered by privilege code.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_PRIVILEGE_GRANT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListGrantsDto,
  ): Promise<PrivilegeGrant[]> {
    return this.grants.list(user.tenant_id, {
      catalogItemId: query.catalogItemId,
      employeeId: query.employeeId,
      status: query.status,
      condition: query.condition,
      facilityId: query.facilityId,
      unitId: query.unitId,
      flagged: query.flagged,
      limit: query.limit,
      offset: query.offset,
    })
  }
}
