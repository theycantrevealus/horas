import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
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
import { StatusService } from '@workforce/appointment/status.service'
import {
  ListAppointmentsDto,
  ListGrantsDto,
  PagingDto,
  StatusDecisionDto,
} from './appointment.dto'

/**
 * Clinical appointments (SPK) of the signed-in user's tenant.
 */
@Controller({ path: 'clinical-appointments', version: '1' })
export class AppointmentController {
  /**
   * @param appointments - Appointment service.
   * @param statuses - Suspension and revocation service.
   */
  constructor(
    private readonly appointments: AppointmentService,
    private readonly statuses: StatusService,
  ) {}

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

  /**
   * Handles `POST /v1/clinical-appointments/:id/suspend`: the Director suspends an SPK.
   *
   * @param user - Signed-in user.
   * @param id - Appointment identifier.
   * @param body - The decision.
   * @returns The SPK and its grants.
   */
  @Post(':id/suspend')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<AppointmentWithGrants> {
    return this.statuses.suspendAppointment(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/clinical-appointments/:id/lift-suspension`: the Director lifts the
   * suspension of an SPK by a new decision.
   *
   * @param user - Signed-in user.
   * @param id - Appointment identifier.
   * @param body - The new decision.
   * @returns The SPK and its grants.
   */
  @Post(':id/lift-suspension')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  liftSuspension(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<AppointmentWithGrants> {
    return this.statuses.liftAppointmentSuspension(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/clinical-appointments/:id/revoke`: the Director revokes an SPK for good,
   * with its grants.
   *
   * @param user - Signed-in user.
   * @param id - Appointment identifier.
   * @param body - The decision.
   * @returns The SPK and its grants.
   */
  @Post(':id/revoke')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<AppointmentWithGrants> {
    return this.statuses.revokeAppointment(user.tenant_id, id, body)
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
   * @param statuses - Suspension and revocation service.
   */
  constructor(
    private readonly grants: GrantService,
    private readonly statuses: StatusService,
  ) {}

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

  /**
   * Handles `POST /v1/privilege-grants/:id/suspend`: the Director suspends one granted privilege.
   *
   * @param user - Signed-in user.
   * @param id - Grant identifier.
   * @param body - The decision.
   * @returns The suspended grant.
   */
  @Post(':id/suspend')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<PrivilegeGrant> {
    return this.statuses.suspendGrant(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/privilege-grants/:id/lift-suspension`: the Director lifts the suspension of
   * one granted privilege by a new decision.
   *
   * @param user - Signed-in user.
   * @param id - Grant identifier.
   * @param body - The new decision.
   * @returns The grant, active again.
   */
  @Post(':id/lift-suspension')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  liftSuspension(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<PrivilegeGrant> {
    return this.statuses.liftGrantSuspension(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/privilege-grants/:id/revoke`: the Director revokes one granted privilege
   * for good.
   *
   * @param user - Signed-in user.
   * @param id - Grant identifier.
   * @param body - The decision.
   * @returns The revoked grant.
   */
  @Post(':id/revoke')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CREDENTIAL_DECIDE)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: StatusDecisionDto,
  ): Promise<PrivilegeGrant> {
    return this.statuses.revokeGrant(user.tenant_id, id, body)
  }
}
