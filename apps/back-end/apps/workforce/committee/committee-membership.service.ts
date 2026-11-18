import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import {
  compareLocalDates,
  isLocalDate,
  todayInZone,
} from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import {
  type CommitteeMembershipRepository,
  type FacilityMembershipQuery,
} from '@repository/interface/committee-membership'
import { type Coding } from '@repository/model/common/coding'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type CommitteeMembership } from '@repository/model/committee-membership'
import { type Facility } from '@repository/model/facility'
import {
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
} from '@repository/token'
import { addDays, normalizeDecisionNumber } from '../assignment/assignment-rules'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { checkMembershipPeriod, SINGLE_HOLDER_ROLES } from './committee-rules'

const NAME = 'CommitteeMembershipService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  committee: /(^|\.)committee$/,
  role: /(^|\.)committee-role$/,
} as const

/**
 * Data of a new membership.
 *
 * @property employeeId - The member.
 * @property facilityId - Facility whose committee it is.
 * @property committee - Committee code.
 * @property role - Role code.
 * @property period - Start, and optional end.
 * @property decisionNumber - Decision (SK) number.
 * @property reason - Why, kept in the change history.
 */
export interface CreateMembershipInput {
  employeeId: string
  facilityId: string
  committee: Coding
  role: Coding
  period: DatePeriod
  decisionNumber?: string
  reason?: string
}

/**
 * Data of the end of a membership.
 *
 * @property date - Last day of the membership.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface EndMembershipInput {
  date: string
  version?: number
  reason?: string
}

/**
 * Committee memberships: who sits on a facility's committees and in which role (HR plan 2.5).
 * Never edits or deletes: a membership is appointed and later ended.
 */
@Injectable()
export class CommitteeMembershipService {
  /**
   * @param memberships - Membership repository.
   * @param employees - Employee repository.
   * @param facilities - Facility repository, for the facility and its time zone.
   * @param concepts - Code concepts, to check committees and roles.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_COMMITTEE_MEMBERSHIP)
    private readonly memberships: CommitteeMembershipRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the memberships of a facility's committees. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier.
   * @param query - Optional filters and paging.
   * @returns The memberships.
   * @throws NotFoundError `facility_not_found`.
   */
  async list(
    tenantId: string,
    facilityId: string,
    query: FacilityMembershipQuery,
  ): Promise<CommitteeMembership[]> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new NotFoundError(
        'facility_not_found',
        'The facility was not found.',
      )
    }
    return this.memberships.findByFacility(tenantId, facility.id, query)
  }

  /**
   * Appoints an employee to a committee (HR plan 2.5 M1 to M6).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The membership.
   * @returns The created membership.
   * @throws InvalidRequestError `invalid_decision_number`, `invalid_committee`, `invalid_role`,
   * `unknown_code`, `code_retired`, `code_not_in_period`, `employee_not_found`,
   * `employee_separated`, `facility_not_found`, `facility_inactive`, `invalid_period` or
   * `start_in_future`.
   * @throws ConflictError `membership_exists`, `chair_exists` or `secretary_exists`.
   */
  create(
    tenantId: string,
    input: CreateMembershipInput,
  ): Promise<CommitteeMembership> {
    return observe(
      this.logger,
      'committee_membership_create',
      `${NAME}.create`,
      async () => {
        const decisionNumber =
          input.decisionNumber === undefined
            ? null
            : normalizeDecisionNumber(input.decisionNumber)
        if (input.decisionNumber !== undefined && decisionNumber === null) {
          throw new InvalidRequestError(
            'invalid_decision_number',
            'The decision number must have 1 to 80 characters.',
          )
        }
        if (!SYSTEMS.committee.test(input.committee.system)) {
          throw new InvalidRequestError(
            'invalid_committee',
            'The committee must come from a committee code system, for example id.committee.',
          )
        }
        if (!SYSTEMS.role.test(input.role.system)) {
          throw new InvalidRequestError(
            'invalid_role',
            'The role must come from a committee-role code system, for example id.committee-role.',
          )
        }
        await this.concepts.assertActive(tenantId, input.committee)
        await this.concepts.assertActive(tenantId, input.role)

        const employee = await this.employees.findOne(input.employeeId)
        if (!employee || employee.tenant_id !== tenantId) {
          throw new InvalidRequestError(
            'employee_not_found',
            'The employee was not found.',
          )
        }
        if (employee.employment_status === 'separated') {
          throw new InvalidRequestError(
            'employee_separated',
            'The employee has separated.',
          )
        }
        const facility = await this.facility(tenantId, input.facilityId)
        const today = todayInZone(facility.timezone)
        const problem = checkMembershipPeriod(input.period, today)
        if (problem) {
          throw new InvalidRequestError(problem.code, problem.message)
        }
        await this.assertFree(
          tenantId,
          employee.id,
          facility.id,
          input.committee.code,
          input.role.code,
        )

        const write = (): Promise<CommitteeMembership> =>
          this.memberships.create({
            tenant_id: tenantId,
            employee_id: employee.id,
            facility_id: facility.id,
            committee: {
              system: input.committee.system,
              code: input.committee.code,
            },
            role: { system: input.role.system, code: input.role.code },
            period: { start: input.period.start, end: input.period.end },
            decision_ref: decisionNumber
              ? { number: decisionNumber, document: null }
              : null,
            status: 'active',
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests at once: the unique indexes decided. Find out which one.
          if (error instanceof RepositoryConflictError) {
            await this.assertFree(
              tenantId,
              employee.id,
              facility.id,
              input.committee.code,
              input.role.code,
            )
            throw this.exists()
          }
          throw error
        }
      },
    )
  }

  /**
   * Ends an active membership on a date (HR plan 2.5 M8).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Membership identifier.
   * @param input - Last day, optional version and reason.
   * @returns The ended membership.
   * @throws NotFoundError `membership_not_found`.
   * @throws InvalidRequestError `membership_not_active` or `invalid_end_date`.
   * @throws ConflictError `stale_version`.
   */
  end(
    tenantId: string,
    id: string,
    input: EndMembershipInput,
  ): Promise<CommitteeMembership> {
    return observe(
      this.logger,
      'committee_membership_end',
      `${NAME}.end`,
      async () => {
        const membership = await this.memberships.findOne(id)
        if (
          !membership ||
          membership.tenant_id !== tenantId ||
          membership.deleted_at
        ) {
          throw this.notFound()
        }
        if (membership.status !== 'active') {
          throw new InvalidRequestError(
            'membership_not_active',
            'The membership has already ended.',
          )
        }
        const facility = await this.facilities.findOne(membership.facility_id, {
          withSoft: true,
        })
        if (!facility) {
          throw this.notFound()
        }
        const latest = addDays(todayInZone(facility.timezone), 1)
        if (
          !isLocalDate(input.date) ||
          compareLocalDates(input.date, membership.period.start) < 0 ||
          compareLocalDates(input.date, latest) > 0
        ) {
          throw new InvalidRequestError(
            'invalid_end_date',
            'The end date must be a real date, not before the start and not later than tomorrow.',
          )
        }
        if (
          input.version !== undefined &&
          input.version !== membership.version
        ) {
          throw this.stale()
        }
        const write = (): Promise<CommitteeMembership> =>
          this.memberships.update(
            membership.id,
            {
              status: 'ended',
              period: { start: membership.period.start, end: input.date },
            },
            { expectedVersion: input.version },
          )
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw this.stale()
          }
          if (error instanceof RepositoryNotFoundError) {
            throw this.notFound()
          }
          throw error
        }
      },
    )
  }

  /**
   * Refuses an appointment that would break the one-role and one-chair rules (M5 and M6).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The member.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @param roleCode - Role code.
   * @throws ConflictError `membership_exists`, `chair_exists` or `secretary_exists`.
   */
  private async assertFree(
    tenantId: string,
    employeeId: string,
    facilityId: string,
    committeeCode: string,
    roleCode: string,
  ): Promise<void> {
    if (
      await this.memberships.findActiveForEmployee(
        tenantId,
        employeeId,
        facilityId,
        committeeCode,
      )
    ) {
      throw this.exists()
    }
    if (
      SINGLE_HOLDER_ROLES.includes(roleCode) &&
      (await this.memberships.findActiveByRole(
        tenantId,
        facilityId,
        committeeCode,
        roleCode,
      ))
    ) {
      throw new ConflictError(
        `${roleCode}_exists`,
        `The committee already has an active ${roleCode}.`,
      )
    }
  }

  /**
   * Loads an active facility of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier.
   * @returns The facility.
   * @throws InvalidRequestError `facility_not_found` or `facility_inactive`.
   */
  private async facility(
    tenantId: string,
    facilityId: string,
  ): Promise<Facility> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The facility was not found.',
      )
    }
    if (facility.status !== 'active') {
      throw new InvalidRequestError(
        'facility_inactive',
        'The facility is not active.',
      )
    }
    return facility
  }

  /**
   * @returns The conflict for a second active membership of the same person and committee.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'membership_exists',
      'The employee already has an active membership in this committee.',
    )
  }

  /**
   * @returns The not-found error for a membership.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'membership_not_found',
      'The membership was not found.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The membership was changed by someone else. Reload it and try again.',
    )
  }
}
