import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { getRequestContext } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import { type FacilityRepository } from '@repository/interface/facility'
import {
  type RosterQuery,
  type RosterRepository,
} from '@repository/interface/roster'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type Roster, type RosterStatus } from '@repository/model/roster'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_ROSTER,
} from '@repository/token'
import { cleanReason } from '../credentialing/application-support'
import { observe } from '../observe'
import { RosterValidationService } from './roster-validation.service'
import { ParameterService } from '../parameter/parameter.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  canMove,
  hasPeriodEnded,
  matchesRosterPeriod,
  type RosterPeriodKind,
} from './roster-rules'

const NAME = 'RosterService'

/**
 * Data of a new roster.
 *
 * @property unitId - The unit.
 * @property period - First and last day; must match `ROSTER_PERIOD`.
 * @property reason - Why, kept in the change history.
 */
export interface CreateRosterInput {
  unitId: string
  period: { start: string; end: string }
  reason?: string
}

/**
 * Optional version and reason of a status move.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RosterMoveInput {
  version?: number
  reason?: string
}

/**
 * Data of a return to draft.
 *
 * @property version - Version the caller read.
 * @property reason - Why it is returned; required.
 */
export interface ReturnRosterInput {
  version?: number
  reason: string
}

/**
 * The rosters of a tenant (HR plan 5.4): list, view, create a draft, and move it through
 * submission, approval, publication and closing. Never deletes. The assignments and their
 * validation are group 5.5.
 */
@Injectable()
export class RosterService {
  /**
   * @param rosters - Roster repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone of "today".
   * @param parameters - HR parameters (`ROSTER_PERIOD`, `ROSTER_APPROVAL_REQUIRED`).
   * @param validation - Validation of a roster, for the gate on `submit` and `publish`.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_ROSTER) private readonly rosters: RosterRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(ParameterService) private readonly parameters: ParameterService,
    @Inject(RosterValidationService)
    private readonly validation: RosterValidationService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists rosters, latest period first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The rosters.
   */
  list(tenantId: string, query: RosterQuery): Promise<Roster[]> {
    return this.rosters.findByFilter(tenantId, query)
  }

  /**
   * Returns one roster. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @returns The roster.
   * @throws NotFoundError `roster_not_found`.
   */
  get(tenantId: string, id: string): Promise<Roster> {
    return this.load(tenantId, id)
  }

  /**
   * Creates an empty draft for a unit and a period (HR plan 5.4 RS2 to RS4).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The roster.
   * @returns The created roster.
   * @throws InvalidRequestError `unit_not_found`, `unit_closed` or `invalid_period`.
   * @throws ConflictError `roster_exists` or `roster_overlaps`.
   * @throws ForbiddenError `actor_required`.
   */
  create(tenantId: string, input: CreateRosterInput): Promise<Roster> {
    return observe(
      this.logger,
      'roster_create',
      `${NAME}.create`,
      async () => {
        const unit = await this.units.findOne(input.unitId)
        if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
          throw new InvalidRequestError(
            'unit_not_found',
            'The unit was not found.',
          )
        }
        if (unit.status !== 'active') {
          throw new InvalidRequestError('unit_closed', 'The unit is closed.')
        }
        const kind = (
          await this.parameters.resolve(tenantId, {
            key: 'ROSTER_PERIOD',
            facilityId: unit.facility_id,
          })
        ).value as RosterPeriodKind
        const period = { start: input.period?.start, end: input.period?.end }
        if (!matchesRosterPeriod(kind, period)) {
          throw new InvalidRequestError(
            'invalid_period',
            'The period must match the roster period of the facility: a calendar month, a Monday to Sunday week, or two weeks starting on a Monday.',
          )
        }
        const actor = this.actor()
        if (await this.rosters.findByUnitAndStart(tenantId, unit.id, period.start)) {
          throw this.exists()
        }
        const overlapping = await this.rosters.findOverlapping(
          tenantId,
          unit.id,
          period.start,
          period.end,
        )
        if (overlapping.length > 0) {
          throw new ConflictError(
            'roster_overlaps',
            'The unit already has a roster that shares days with this period.',
          )
        }
        const write = (): Promise<Roster> =>
          this.rosters.create({
            tenant_id: tenantId,
            unit_id: unit.id,
            facility_id: unit.facility_id,
            period,
            status: 'draft',
            revision: 0,
            prepared_by: actor,
            submitted: null,
            approved: null,
            published: null,
            closed: null,
            return_reason: null,
            coverage_overrides: [],
            validation: null,
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests for the same unit and start at once: the unique index decided.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Sends a draft for approval. Only when approval is required for the unit (HR plan 5.4 RS5,
   * RS6).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - Optional version and reason.
   * @returns The submitted roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `approval_not_required`, `roster_invalid` or
   * `coverage_gaps` (the gate, HR plan 5.5 RA17).
   * @throws ConflictError `stale_version`.
   */
  submit(
    tenantId: string,
    id: string,
    input: RosterMoveInput,
  ): Promise<Roster> {
    return this.move(
      tenantId,
      id,
      input,
      'roster_submit',
      'submit',
      async (roster) => {
        this.assertMove(roster, 'submitted')
        if (!(await this.approvalRequired(tenantId, roster))) {
          throw new InvalidRequestError(
            'approval_not_required',
            'This unit does not need approval: publish the draft directly.',
          )
        }
        const validation = await this.validation.gate(tenantId, roster)
        return {
          status: 'submitted',
          submitted: this.stamp(),
          return_reason: null,
          validation,
        }
      },
    )
  }

  /**
   * Approves a submitted roster. The approver is not the preparer (HR plan 5.4 RS7).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - Optional version and reason.
   * @returns The approved roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `invalid_transition`.
   * @throws ForbiddenError `approver_is_preparer`.
   * @throws ConflictError `stale_version`.
   */
  approve(
    tenantId: string,
    id: string,
    input: RosterMoveInput,
  ): Promise<Roster> {
    return this.move(
      tenantId,
      id,
      input,
      'roster_approve',
      'approve',
      (roster) => {
        this.assertMove(roster, 'approved')
        const stamp = this.stamp()
        if (
          stamp.by.account_id !== null &&
          stamp.by.account_id === roster.prepared_by.account_id
        ) {
          throw new ForbiddenError(
            'approver_is_preparer',
            'A roster cannot be approved by the person who prepared it.',
          )
        }
        return Promise.resolve({ status: 'approved', approved: stamp })
      },
    )
  }

  /**
   * Returns a submitted or approved roster to draft with a reason (HR plan 5.4 RS8).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - The reason and an optional version.
   * @returns The draft roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `reason_required`, `invalid_reason` or `invalid_transition`.
   * @throws ConflictError `stale_version`.
   */
  return(
    tenantId: string,
    id: string,
    input: ReturnRosterInput,
  ): Promise<Roster> {
    return this.move(
      tenantId,
      id,
      { version: input.version },
      'roster_return',
      'return',
      (roster) => {
        const reason = cleanReason(input.reason)
        if (roster.status !== 'submitted' && roster.status !== 'approved') {
          throw this.invalidTransition(roster.status, 'draft')
        }
        return Promise.resolve({
          status: 'draft',
          submitted: null,
          approved: null,
          return_reason: reason,
        })
      },
    )
  }

  /**
   * Publishes an approved roster, or a draft when approval is not required (HR plan 5.4 RS6, RS9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - Optional version and reason.
   * @returns The published roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `approval_required`, and for a draft
   * `roster_invalid` or `coverage_gaps` (the gate, HR plan 5.5 RA17).
   * @throws ConflictError `stale_version`.
   */
  publish(
    tenantId: string,
    id: string,
    input: RosterMoveInput,
  ): Promise<Roster> {
    return this.move(
      tenantId,
      id,
      input,
      'roster_publish',
      'publish',
      async (roster) => {
        this.assertMove(roster, 'published')
        if (
          roster.status === 'draft' &&
          (await this.approvalRequired(tenantId, roster))
        ) {
          throw new InvalidRequestError(
            'approval_required',
            'This roster must be submitted and approved before it is published.',
          )
        }
        const validation =
          roster.status === 'draft'
            ? await this.validation.gate(tenantId, roster)
            : roster.validation
        return {
          status: 'published',
          published: this.stamp(),
          revision: 1,
          validation,
        }
      },
    )
  }

  /**
   * Closes a published roster after its period (HR plan 5.4 RS10).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - Optional version and reason.
   * @returns The closed roster.
   * @throws NotFoundError `roster_not_found`.
   * @throws InvalidRequestError `invalid_transition` or `period_not_ended`.
   * @throws ConflictError `stale_version`.
   */
  close(
    tenantId: string,
    id: string,
    input: RosterMoveInput,
  ): Promise<Roster> {
    return this.move(
      tenantId,
      id,
      input,
      'roster_close',
      'close',
      async (roster) => {
        this.assertMove(roster, 'closed')
        if (!hasPeriodEnded(roster.period, await this.today(roster))) {
          throw new InvalidRequestError(
            'period_not_ended',
            'A roster can be closed only after the last day of its period.',
          )
        }
        return { status: 'closed', closed: this.stamp() }
      },
    )
  }

  /**
   * Runs one status move: loads the roster, checks the version, computes the changes and writes
   * them with the version that was read, so two moves at once cannot both succeed (HR plan 5.4
   * RS15).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @param input - Optional version and reason.
   * @param event - Name of the log entry.
   * @param method - Name of the public method, for the operation field.
   * @param changes - Checks the move and returns the fields to write.
   * @returns The updated roster.
   */
  private move(
    tenantId: string,
    id: string,
    input: RosterMoveInput,
    event: string,
    method: string,
    changes: (roster: Roster) => Promise<Partial<Roster>>,
  ): Promise<Roster> {
    return observe(this.logger, event, `${NAME}.${method}`, async () => {
      const roster = await this.load(tenantId, id)
      if (input.version !== undefined && input.version !== roster.version) {
        throw this.stale()
      }
      const update = await changes(roster)
      const write = (): Promise<Roster> =>
        this.rosters.update(roster.id, update, {
          expectedVersion: roster.version,
        })
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
    })
  }

  /**
   * Refuses a status move the lifecycle does not have.
   *
   * @param roster - The roster as read.
   * @param to - The wanted status.
   * @throws InvalidRequestError `invalid_transition`.
   */
  private assertMove(roster: Roster, to: RosterStatus): void {
    if (!canMove(roster.status, to)) {
      throw this.invalidTransition(roster.status, to)
    }
  }

  /**
   * @param from - Current status.
   * @param to - Wanted status.
   * @returns The rejection for a move the lifecycle does not have.
   */
  private invalidTransition(
    from: RosterStatus,
    to: RosterStatus,
  ): InvalidRequestError {
    return new InvalidRequestError(
      'invalid_transition',
      `A roster that is ${from} cannot move to ${to}.`,
    )
  }

  /**
   * Reads `ROSTER_APPROVAL_REQUIRED` for the roster's unit.
   *
   * @param tenantId - Tenant of the caller.
   * @param roster - The roster.
   * @returns True when approval is required.
   */
  private async approvalRequired(
    tenantId: string,
    roster: Roster,
  ): Promise<boolean> {
    const value = await this.parameters.resolve(tenantId, {
      key: 'ROSTER_APPROVAL_REQUIRED',
      unitId: roster.unit_id,
    })
    return value.value === true
  }

  /**
   * Returns today's local date in the zone of the roster's facility; UTC when it cannot be read.
   *
   * @param roster - The roster.
   * @returns Today as `YYYY-MM-DD`.
   */
  private async today(roster: Roster): Promise<string> {
    const facility = await this.facilities.findOne(roster.facility_id)
    return facility ? todayInZone(facility.timezone) : todayUtc()
  }

  /**
   * @returns A stamp of the signed-in actor and now.
   * @throws ForbiddenError `actor_required`.
   */
  private stamp(): { by: ActorRef; at: Date } {
    return { by: this.actor(), at: new Date() }
  }

  /**
   * @returns The signed-in actor.
   * @throws ForbiddenError `actor_required`.
   */
  private actor(): ActorRef {
    const actor = getRequestContext()?.actor
    if (!actor) {
      throw new ForbiddenError(
        'actor_required',
        'A signed-in actor is required.',
      )
    }
    return actor
  }

  /**
   * Loads a roster of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Roster identifier.
   * @returns The roster.
   * @throws NotFoundError `roster_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Roster> {
    const roster = await this.rosters.findOne(id)
    if (!roster || roster.tenant_id !== tenantId || roster.deleted_at) {
      throw this.notFound()
    }
    return roster
  }

  /**
   * @returns The not-found error for a roster.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('roster_not_found', 'The roster was not found.')
  }

  /**
   * @returns The conflict for a second roster of a unit with the same start.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'roster_exists',
      'The unit already has a roster that starts on this date.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The roster was changed by someone else. Reload it and try again.',
    )
  }
}
