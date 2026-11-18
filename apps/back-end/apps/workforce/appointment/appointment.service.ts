import { Inject, Injectable } from '@nestjs/common'
import { todayUtc } from '@utility/validation/local-date'
import {
  type AppointmentPaging,
  type ClinicalAppointmentRepository,
} from '@repository/interface/clinical-appointment'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import {
  type ClinicalAppointment,
  type ClinicalAppointmentStatus,
} from '@repository/model/clinical-appointment'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_PRIVILEGE_GRANT,
} from '@repository/token'
import { addDays } from '../credentialing/appointment-rules'
import { NotFoundError } from '../workforce.error'

/**
 * Filters and paging of the SPK list.
 *
 * @property status - Only appointments in this status.
 * @property employeeId - Only the practitioner's appointments.
 * @property facilityId - Only appointments that cover this facility.
 * @property unitId - Only appointments that cover this unit.
 * @property expiringInDays - Only current appointments whose last valid day is within this many
 * days from today (UTC), including those already past it that no job has expired yet.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListAppointmentsInput {
  status?: ClinicalAppointmentStatus
  employeeId?: string
  facilityId?: string
  unitId?: string
  expiringInDays?: number
  limit?: number
  offset?: number
}

/**
 * An SPK with its grants (the RKK).
 *
 * @property appointment - The SPK.
 * @property grants - Every grant of the SPK, whatever its status, ordered by privilege code.
 */
export interface AppointmentWithGrants {
  appointment: ClinicalAppointment
  grants: PrivilegeGrant[]
}

/**
 * Reads of the clinical appointments (SPK) of the tenant (HR plan 4.3, part 2). Every method is
 * a read and writes no log entry.
 */
@Injectable()
export class AppointmentService {
  /**
   * @param appointments - Clinical appointment repository.
   * @param grants - Privilege grant repository.
   * @param employees - Employee repository, to check the practitioner of a nested list.
   */
  constructor(
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
  ) {}

  /**
   * Lists SPKs, the soonest end of validity first (HR plan 4.3 SP12). Nothing sets `expired`
   * yet, so a list by status can hold an SPK past its end; read `valid_period.end` too.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns The appointments.
   */
  list(
    tenantId: string,
    input: ListAppointmentsInput,
  ): Promise<ClinicalAppointment[]> {
    const { expiringInDays, ...rest } = input
    return this.appointments.findByFilter(tenantId, {
      ...rest,
      ...(expiringInDays === undefined
        ? {}
        : {
            current: true,
            endOnOrBefore: addDays(todayUtc(), expiringInDays),
          }),
    })
  }

  /**
   * Lists one practitioner's SPKs, the newest start of validity first.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The practitioner.
   * @param paging - Page size and offset.
   * @returns The appointments.
   * @throws NotFoundError `employee_not_found`.
   */
  async listByEmployee(
    tenantId: string,
    employeeId: string,
    paging: AppointmentPaging,
  ): Promise<ClinicalAppointment[]> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return this.appointments.findByEmployee(tenantId, employee.id, paging)
  }

  /**
   * Returns one SPK with its grants.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @returns The appointment and its grants.
   * @throws NotFoundError `appointment_not_found`.
   */
  async get(tenantId: string, id: string): Promise<AppointmentWithGrants> {
    const appointment = await this.appointments.findOne(id)
    if (
      !appointment ||
      appointment.tenant_id !== tenantId ||
      appointment.deleted_at
    ) {
      throw new NotFoundError(
        'appointment_not_found',
        'The appointment was not found.',
      )
    }
    return {
      appointment,
      grants: await this.grants.findByAppointment(tenantId, appointment.id),
    }
  }
}
