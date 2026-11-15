import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { todayInZone } from '@utility/validation/local-date'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type FacilityRepository } from '@repository/interface/facility'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'
import { type StatusDecision } from '@repository/model/common/decision'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_FACILITY,
  REPOSITORY_PRIVILEGE_GRANT,
} from '@repository/token'
import { cleanReason } from '../credentialing/application-support'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { type AppointmentWithGrants } from './appointment.service'

const NAME = 'StatusService'

/**
 * Longest decision number (the letter that records a decision).
 */
const MAX_DECISION_NUMBER = 64

/**
 * What a Director's decision on an SPK or a grant carries.
 *
 * @property reason - Why, 1 to 500 characters.
 * @property decisionNumber - The letter that records the decision, 1 to 64 characters.
 * @property version - Version of the record the caller read.
 */
export interface StatusDecisionInput {
  reason: string
  decisionNumber: string
  version?: number
}

/**
 * Suspension, lifting of a suspension and revocation of SPKs and of single grants, by the
 * Director's decision (HR plan 4.3 SP9 to SP11, HR-CRD-006 and 7.4.5). Every change is dated
 * today in the credentialing facility's zone, runs in one transaction with the grants and flags
 * it affects, and is never deleted.
 */
@Injectable()
export class StatusService {
  /**
   * @param appointments - Clinical appointment repository.
   * @param grants - Privilege grant repository.
   * @param facilities - Facility repository, for the time zone of the decision date.
   * @param transactions - Transaction manager of the main connection.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Suspends an active SPK. Its grants stay as they are (eligibility reads the SPK status); the
   * supervised grants of its full grants are flagged.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @param input - The decision.
   * @returns The SPK and its grants.
   * @throws NotFoundError `appointment_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required`, `invalid_reason`,
   * `decision_number_required`, `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  suspendAppointment(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<AppointmentWithGrants> {
    return this.changeAppointment(
      tenantId,
      id,
      input,
      'appointment_suspend',
      'suspendAppointment',
      async (appointment, decision, now) => {
        if (appointment.status !== 'active') {
          throw this.invalidTransition('Only an active SPK can be suspended.')
        }
        const updated = await this.appointments.update(
          appointment.id,
          { status: 'suspended', suspension: decision },
          { expectedVersion: input.version },
        )
        const flagged = await this.flagDependents(
          tenantId,
          await this.fullActiveGrantIds(tenantId, appointment.id),
          now,
        )
        return { updated, flagged }
      },
    )
  }

  /**
   * Lifts the suspension of an SPK by a new decision, and resolves the flags its suspension
   * raised.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @param input - The new decision.
   * @returns The SPK and its grants.
   * @throws NotFoundError `appointment_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required`, `invalid_reason`,
   * `decision_number_required`, `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  liftAppointmentSuspension(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<AppointmentWithGrants> {
    return this.changeAppointment(
      tenantId,
      id,
      input,
      'appointment_lift_suspension',
      'liftAppointmentSuspension',
      async (appointment, _decision, now) => {
        if (appointment.status !== 'suspended') {
          throw this.invalidTransition('Only a suspended SPK can be lifted.')
        }
        const updated = await this.appointments.update(
          appointment.id,
          { status: 'active', suspension: null },
          { expectedVersion: input.version },
        )
        const resolved = await this.resolveFlags(
          tenantId,
          await this.fullActiveGrantIds(tenantId, appointment.id),
          now,
        )
        return { updated, flagged: resolved }
      },
      `Lift of the suspension, decision ${input.decisionNumber}`,
    )
  }

  /**
   * Revokes an SPK for good, with every grant of it that is not revoked, and flags the supervised
   * grants of other SPKs that lose their supervisor.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @param input - The decision.
   * @returns The SPK and its grants.
   * @throws NotFoundError `appointment_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required`, `invalid_reason`,
   * `decision_number_required`, `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  revokeAppointment(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<AppointmentWithGrants> {
    return this.changeAppointment(
      tenantId,
      id,
      input,
      'appointment_revoke',
      'revokeAppointment',
      async (appointment, decision, now) => {
        if (appointment.status !== 'active' && appointment.status !== 'suspended') {
          throw this.invalidTransition('Only an active or suspended SPK can be revoked.')
        }
        const updated = await this.appointments.update(
          appointment.id,
          { status: 'revoked', is_current: false, revocation: decision },
          { expectedVersion: input.version },
        )
        const lost: string[] = []
        for (const grant of await this.grants.findByAppointment(
          tenantId,
          appointment.id,
        )) {
          if (grant.status === 'revoked') {
            continue
          }
          await this.grants.update(grant.id, {
            status: 'revoked',
            status_change: decision,
          })
          if (grant.condition === 'full') {
            lost.push(grant.id)
          }
        }
        return { updated, flagged: await this.flagDependents(tenantId, lost, now) }
      },
    )
  }

  /**
   * Suspends an active grant of a current SPK, and flags the grants it supervises.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Grant identifier.
   * @param input - The decision.
   * @returns The suspended grant.
   * @throws NotFoundError `grant_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `appointment_not_current`,
   * `reason_required`, `invalid_reason`, `decision_number_required`,
   * `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  suspendGrant(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<PrivilegeGrant> {
    return this.changeGrant(
      tenantId,
      id,
      input,
      'grant_suspend',
      'suspendGrant',
      async (grant, _appointment, decision, now) => {
        if (grant.status !== 'active') {
          throw this.invalidTransition('Only an active grant can be suspended.')
        }
        const updated = await this.grants.update(
          grant.id,
          { status: 'suspended', status_change: decision },
          { expectedVersion: input.version },
        )
        const flagged = await this.flagDependents(
          tenantId,
          grant.condition === 'full' ? [grant.id] : [],
          now,
        )
        return { updated, flagged }
      },
    )
  }

  /**
   * Lifts the suspension of a grant by a new decision. The flags it raised are resolved unless
   * the SPK is itself suspended; lifting the SPK resolves them then.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Grant identifier.
   * @param input - The new decision.
   * @returns The grant, active again.
   * @throws NotFoundError `grant_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `appointment_not_current`,
   * `reason_required`, `invalid_reason`, `decision_number_required`,
   * `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  liftGrantSuspension(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<PrivilegeGrant> {
    return this.changeGrant(
      tenantId,
      id,
      input,
      'grant_lift_suspension',
      'liftGrantSuspension',
      async (grant, appointment, _decision, now) => {
        if (grant.status !== 'suspended') {
          throw this.invalidTransition('Only a suspended grant can be lifted.')
        }
        const updated = await this.grants.update(
          grant.id,
          { status: 'active', status_change: null },
          { expectedVersion: input.version },
        )
        const resolved = await this.resolveFlags(
          tenantId,
          grant.condition === 'full' && appointment.status === 'active'
            ? [grant.id]
            : [],
          now,
        )
        return { updated, flagged: resolved }
      },
      `Lift of the suspension, decision ${input.decisionNumber}`,
    )
  }

  /**
   * Revokes a grant for good, and flags the grants it supervises.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Grant identifier.
   * @param input - The decision.
   * @returns The revoked grant.
   * @throws NotFoundError `grant_not_found`.
   * @throws InvalidRequestError `invalid_transition`, `appointment_not_current`,
   * `reason_required`, `invalid_reason`, `decision_number_required`,
   * `invalid_decision_number` or `facility_not_found`.
   * @throws ConflictError `stale_version`.
   */
  revokeGrant(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
  ): Promise<PrivilegeGrant> {
    return this.changeGrant(
      tenantId,
      id,
      input,
      'grant_revoke',
      'revokeGrant',
      async (grant, _appointment, decision, now) => {
        if (grant.status !== 'active' && grant.status !== 'suspended') {
          throw this.invalidTransition('Only an active or suspended grant can be revoked.')
        }
        const updated = await this.grants.update(
          grant.id,
          { status: 'revoked', status_change: decision },
          { expectedVersion: input.version },
        )
        const flagged = await this.flagDependents(
          tenantId,
          grant.condition === 'full' ? [grant.id] : [],
          now,
        )
        return { updated, flagged }
      },
    )
  }

  /**
   * Runs one decision on an SPK: loads it, checks the input, writes in one transaction and
   * returns the SPK with its grants.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @param input - The decision.
   * @param event - Log event name.
   * @param operation - Method name for the log.
   * @param change - Checks the transition and writes; returns the updated SPK and the flags
   * set or resolved.
   * @param reason - Change-history reason; the decision reason when omitted.
   * @returns The SPK and its grants.
   */
  private changeAppointment(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
    event: string,
    operation: string,
    change: (
      appointment: ClinicalAppointment,
      decision: StatusDecision,
      now: Date,
    ) => Promise<{ updated: ClinicalAppointment; flagged: number }>,
    reason?: string,
  ): Promise<AppointmentWithGrants> {
    return observe(
      this.logger,
      event,
      `${NAME}.${operation}`,
      async () => {
        const checked = this.check(input)
        const appointment = await this.loadAppointment(tenantId, id)
        const decision = await this.decisionOf(
          tenantId,
          appointment,
          checked.reason,
          checked.decisionNumber,
        )
        const now = new Date()
        return this.write(
          'appointment_not_found',
          reason === undefined
            ? checked.reason
            : `${reason}: ${checked.reason}`,
          () =>
            this.transactions.run(async () => {
              const { updated, flagged } = await change(appointment, decision, now)
              return {
                result: {
                  appointment: updated,
                  grants: await this.grants.findByAppointment(
                    tenantId,
                    appointment.id,
                  ),
                },
                flagged,
              }
            }),
        )
      },
      'log',
      (outcome) => ({ flagged: outcome.flagged }),
    ).then((outcome) => outcome.result)
  }

  /**
   * Runs one decision on a grant: loads it and its SPK, checks the input, writes in one
   * transaction and returns the grant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Grant identifier.
   * @param input - The decision.
   * @param event - Log event name.
   * @param operation - Method name for the log.
   * @param change - Checks the transition and writes; returns the updated grant and the flags
   * set or resolved.
   * @param reason - Change-history reason; the decision reason when omitted.
   * @returns The updated grant.
   */
  private changeGrant(
    tenantId: string,
    id: string,
    input: StatusDecisionInput,
    event: string,
    operation: string,
    change: (
      grant: PrivilegeGrant,
      appointment: ClinicalAppointment,
      decision: StatusDecision,
      now: Date,
    ) => Promise<{ updated: PrivilegeGrant; flagged: number }>,
    reason?: string,
  ): Promise<PrivilegeGrant> {
    return observe(
      this.logger,
      event,
      `${NAME}.${operation}`,
      async () => {
        const checked = this.check(input)
        const grant = await this.loadGrant(tenantId, id)
        const appointment = await this.loadAppointment(
          tenantId,
          grant.appointment_id,
        )
        if (!appointment.is_current) {
          throw new InvalidRequestError(
            'appointment_not_current',
            'The SPK of this grant is no longer current.',
          )
        }
        const decision = await this.decisionOf(
          tenantId,
          appointment,
          checked.reason,
          checked.decisionNumber,
        )
        const now = new Date()
        return this.write(
          'grant_not_found',
          reason === undefined
            ? checked.reason
            : `${reason}: ${checked.reason}`,
          () =>
            this.transactions.run(async () => {
              const { updated, flagged } = await change(
                grant,
                appointment,
                decision,
                now,
              )
              return { result: updated, flagged }
            }),
        )
      },
      'log',
      (outcome) => ({ flagged: outcome.flagged }),
    ).then((outcome) => outcome.result)
  }

  /**
   * Checks the reason and the decision number of a decision.
   *
   * @param input - The decision as sent.
   * @returns The cleaned reason and decision number.
   * @throws InvalidRequestError `reason_required`, `invalid_reason`,
   * `decision_number_required` or `invalid_decision_number`.
   */
  private check(input: StatusDecisionInput): {
    reason: string
    decisionNumber: string
  } {
    const reason = cleanReason(input.reason)
    const decisionNumber = (input.decisionNumber ?? '').trim()
    if (decisionNumber.length === 0) {
      throw new InvalidRequestError(
        'decision_number_required',
        'The decision number is required.',
      )
    }
    if (decisionNumber.length > MAX_DECISION_NUMBER) {
      throw new InvalidRequestError(
        'invalid_decision_number',
        'The decision number can have at most 64 characters.',
      )
    }
    return { reason, decisionNumber }
  }

  /**
   * Builds the decision record, dated today in the credentialing facility's zone (SP9).
   *
   * @param tenantId - Tenant of the caller.
   * @param appointment - The SPK.
   * @param reason - The cleaned reason.
   * @param decisionNumber - The cleaned decision number.
   * @returns The decision.
   * @throws InvalidRequestError `facility_not_found`.
   */
  private async decisionOf(
    tenantId: string,
    appointment: ClinicalAppointment,
    reason: string,
    decisionNumber: string,
  ): Promise<StatusDecision> {
    const facility = await this.facilities.findOne(
      appointment.credentialing_facility_id,
    )
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The credentialing facility was not found.',
      )
    }
    return {
      effective_date: todayInZone(facility.timezone),
      reason,
      decision_ref: { number: decisionNumber, document: null },
    }
  }

  /**
   * Runs a write with the change reason and turns repository rejections into workforce errors.
   *
   * @param notFound - Code of the 404 for a record that vanished.
   * @param reason - The reason shown in the change history.
   * @param work - The write.
   * @returns What `work` returns.
   */
  private async write<T>(
    notFound: string,
    reason: string,
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await withChangeReason(reason, work)
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The record was changed by someone else. Reload it and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw new NotFoundError(notFound, 'The record was not found.')
      }
      throw error
    }
  }

  /**
   * Finds the identifiers of the active full grants of an SPK: the grants that can supervise.
   *
   * @param tenantId - Tenant of the caller.
   * @param appointmentId - The SPK.
   * @returns The grant identifiers.
   */
  private async fullActiveGrantIds(
    tenantId: string,
    appointmentId: string,
  ): Promise<string[]> {
    return (await this.grants.findByAppointment(tenantId, appointmentId))
      .filter((grant) => grant.condition === 'full' && grant.status === 'active')
      .map((grant) => grant.id)
  }

  /**
   * Flags, with `supervisor_lost_privilege`, the supervised grants that name one of the given
   * grants as their supervisor's grant (HR-CRD-006). A grant that is revoked or already has an
   * open flag is left alone.
   *
   * @param tenantId - Tenant of the caller.
   * @param lostGrantIds - The grants that stopped being active.
   * @param now - The time of the decision.
   * @returns The number of grants flagged.
   */
  private async flagDependents(
    tenantId: string,
    lostGrantIds: string[],
    now: Date,
  ): Promise<number> {
    let flagged = 0
    for (const lostId of lostGrantIds) {
      for (const dependent of await this.grants.findBySupervisorGrant(
        tenantId,
        lostId,
      )) {
        if (
          dependent.status !== 'revoked' &&
          (dependent.flag === null || dependent.flag.resolved_at !== null)
        ) {
          await this.grants.update(dependent.id, {
            flag: {
              reason: 'supervisor_lost_privilege',
              at: now,
              resolved_at: null,
            },
          })
          flagged += 1
        }
      }
    }
    return flagged
  }

  /**
   * Resolves the open flags of the supervised grants that name one of the given grants.
   *
   * @param tenantId - Tenant of the caller.
   * @param grantIds - The grants that are active again.
   * @param now - The time of the decision.
   * @returns The number of flags resolved.
   */
  private async resolveFlags(
    tenantId: string,
    grantIds: string[],
    now: Date,
  ): Promise<number> {
    let resolved = 0
    for (const grantId of grantIds) {
      for (const dependent of await this.grants.findBySupervisorGrant(
        tenantId,
        grantId,
      )) {
        if (dependent.flag !== null && dependent.flag.resolved_at === null) {
          await this.grants.update(dependent.id, {
            flag: { ...dependent.flag, resolved_at: now },
          })
          resolved += 1
        }
      }
    }
    return resolved
  }

  /**
   * Loads an SPK of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Appointment identifier.
   * @returns The appointment.
   * @throws NotFoundError `appointment_not_found`.
   */
  private async loadAppointment(
    tenantId: string,
    id: string,
  ): Promise<ClinicalAppointment> {
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
    return appointment
  }

  /**
   * Loads a grant of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Grant identifier.
   * @returns The grant.
   * @throws NotFoundError `grant_not_found`.
   */
  private async loadGrant(
    tenantId: string,
    id: string,
  ): Promise<PrivilegeGrant> {
    const grant = await this.grants.findOne(id)
    if (!grant || grant.tenant_id !== tenantId || grant.deleted_at) {
      throw new NotFoundError('grant_not_found', 'The grant was not found.')
    }
    return grant
  }

  /**
   * @param message - What is allowed.
   * @returns The error for a move outside the status table (HR plan 4.3 SP9 and SP10).
   */
  private invalidTransition(message: string): InvalidRequestError {
    return new InvalidRequestError('invalid_transition', message)
  }
}
