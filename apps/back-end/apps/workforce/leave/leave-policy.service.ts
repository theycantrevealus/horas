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
import { isLocalDate, todayUtc } from '@utility/validation/local-date'
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { type Coding } from '@repository/model/common/coding'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { REPOSITORY_LEAVE_POLICY, REPOSITORY_LEAVE_REQUEST } from '@repository/token'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { CodeConceptService } from '../concept/code-concept.service'
import { systemSuffix } from '../concept/system-rules'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  checkPolicyInput,
  toPolicyInput,
  type LeavePolicyInput,
} from './leave-policy-rules'
import { findPolicyBundle } from './policy-bundles'
import { versionsInForce } from './policy-in-force'

const NAME = 'LeavePolicyService'

/**
 * Earliest date a policy version may start on.
 */
const FIRST_EFFECTIVE_DATE = '2000-01-01'

/**
 * Most versions read when the list is cut to the versions in force on a date. A tenant has a few
 * dozen leave types with a handful of versions each.
 */
const ON_DATE_SCAN_LIMIT = 1000

/**
 * Data of a new policy version.
 *
 * @property leaveType - The leave type, a code of a `…leave-type` system.
 * @property effectiveFrom - First date the version applies, today or later.
 * @property reason - Why, kept in the change history.
 */
export interface CreateLeavePolicyInput extends LeavePolicyInput {
  leaveType: Coding
  effectiveFrom: string
  reason?: string
}

/**
 * Fields an edit can change; the ones not sent keep their stored value.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdateLeavePolicyInput extends Partial<LeavePolicyInput> {
  version?: number
  reason?: string
}

/**
 * Filters and paging of the list.
 *
 * @property leaveTypeSystem - Only policies of this code system.
 * @property leaveTypeCode - Only policies of this leave type code.
 * @property onDate - Keep, for each leave type, only the version in force on this date.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface LeavePolicyListQuery {
  leaveTypeSystem?: string
  leaveTypeCode?: string
  onDate?: string
  limit?: number
  offset?: number
}

/**
 * Data of a bundle import.
 *
 * @property bundle - Bundle name, for example `id`.
 * @property effectiveFrom - First date the created versions apply, today or later.
 * @property reason - Why, kept in the change history.
 */
export interface ImportLeavePoliciesInput {
  bundle: string
  effectiveFrom: string
  reason?: string
}

/**
 * What an import did.
 *
 * @property created - Versions created.
 * @property skipped - Types that already had a version on that date.
 */
export interface ImportLeavePoliciesResult {
  created: number
  skipped: number
}

/**
 * The leave policies of a tenant (HR plan 8.1): list, add, edit before they start, and import a
 * country bundle. Never deletes. A version is identified by its leave type and start date, which
 * never change; a version in force is replaced by adding a later one.
 */
@Injectable()
export class LeavePolicyService {
  /**
   * @param policies - Leave policy repository.
   * @param concepts - Code concepts, for the leave type and the employment types.
   * @param requests - Leave request repository, to see whether a version is in use.
   * @param transactions - Transaction manager, so an import writes all or nothing.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_POLICY)
    private readonly policies: LeavePolicyRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists policy versions, ordered by leave type code and then start date, latest first. With
   * `onDate` only the version in force of each type is kept. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The policy versions.
   */
  async list(
    tenantId: string,
    query: LeavePolicyListQuery,
  ): Promise<LeavePolicy[]> {
    if (query.onDate === undefined) {
      return this.policies.findByFilter(tenantId, query)
    }
    const { onDate, offset, limit, ...filter } = query
    const versions = await this.policies.findByFilter(tenantId, {
      ...filter,
      limit: ON_DATE_SCAN_LIMIT,
    })
    const start = offset ?? 0
    return versionsInForce(versions, onDate).slice(start, start + (limit ?? 10))
  }

  /**
   * Finds the version of a leave type in force on a date. Used by the other leave services. Writes
   * no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param leaveType - The leave type.
   * @param date - Local date.
   * @returns The version, or `null` when none applies yet.
   */
  inForce(
    tenantId: string,
    leaveType: Coding,
    date: string,
  ): Promise<LeavePolicy | null> {
    return this.policies.findInForce(tenantId, leaveType, date)
  }

  /**
   * Adds a policy version (HR plan 8.1 LP1 to LP5).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The version.
   * @returns The created policy.
   * @throws InvalidRequestError `invalid_leave_type`, `invalid_date`, `effective_in_past`, the
   * codes of `checkPolicyInput`, and the concept service's `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws ConflictError `policy_exists`.
   */
  create(
    tenantId: string,
    input: CreateLeavePolicyInput,
  ): Promise<LeavePolicy> {
    return observe(
      this.logger,
      'leave_policy_create',
      `${NAME}.create`,
      async () => {
        this.checkEffectiveFrom(input.effectiveFrom)
        if (systemSuffix(input.leaveType.system) !== 'leave-type') {
          throw new InvalidRequestError(
            'invalid_leave_type',
            'The leave type must be a code of a leave type system.',
          )
        }
        await this.concepts.assertActive(tenantId, input.leaveType)
        const fields = checkPolicyInput(input)
        await this.assertEmploymentTypes(tenantId, fields.employment_types)
        const leaveType = {
          system: input.leaveType.system,
          code: input.leaveType.code,
        }
        if (
          await this.policies.findByTypeAndDate(
            tenantId,
            leaveType,
            input.effectiveFrom,
          )
        ) {
          throw this.exists()
        }
        return this.write(
          input.reason,
          () =>
            this.policies.create({
              tenant_id: tenantId,
              leave_type: leaveType,
              effective_from: input.effectiveFrom,
              ...fields,
              source: { kind: 'manual', bundle_id: null },
            }),
          () => this.exists(),
        )
      },
    )
  }

  /**
   * Edits a version that has not started (HR plan 8.1 LP6). The fields not sent keep their value,
   * and the merged rules are checked as a whole.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Policy identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated policy.
   * @throws NotFoundError `leave_policy_not_found`.
   * @throws InvalidRequestError `policy_in_force`, `policy_in_use`, `empty_update` and the codes of `create` for
   * the fields that are sent.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateLeavePolicyInput,
  ): Promise<LeavePolicy> {
    return observe(
      this.logger,
      'leave_policy_update',
      `${NAME}.update`,
      async () => {
        const policy = await this.load(tenantId, id)
        const { version, reason, ...sent } = input
        const changes = Object.fromEntries(
          Object.entries(sent).filter(([, value]) => value !== undefined),
        )
        if (Object.keys(changes).length === 0) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        if (policy.effective_from <= todayUtc()) {
          throw new InvalidRequestError(
            'policy_in_force',
            'A version that is in force cannot be changed. Add a version that starts later.',
          )
        }
        if (await this.requests.findAnyByPolicy(tenantId, policy.id)) {
          throw new InvalidRequestError(
            'policy_in_use',
            'A leave request was made under this version. Add a version that starts later.',
          )
        }
        const fields = checkPolicyInput({ ...toPolicyInput(policy), ...changes })
        if (sent.employmentTypes !== undefined) {
          await this.assertEmploymentTypes(tenantId, fields.employment_types)
        }
        if (version !== undefined && version !== policy.version) {
          throw this.stale()
        }
        // An edit cannot break the unique key (the type and the date never change), so a conflict
        // here is a stale version.
        return this.write(
          reason,
          () =>
            this.policies.update(policy.id, fields, {
              expectedVersion: version,
            }),
          () => this.stale(),
        )
      },
    )
  }

  /**
   * Copies the policies of a country bundle into the tenant as versions starting on a date (HR plan
   * 8.1 LP8). Types that already have a version on that date are skipped, so importing twice
   * changes nothing. Everything is written in one transaction.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Bundle name, start date and optional reason.
   * @returns How many versions were created and skipped.
   * @throws InvalidRequestError `unknown_bundle`, `invalid_date`, `effective_in_past` or
   * `concepts_missing` (import the code concept bundle first).
   */
  import(
    tenantId: string,
    input: ImportLeavePoliciesInput,
  ): Promise<ImportLeavePoliciesResult> {
    return observe(
      this.logger,
      'leave_policy_import',
      `${NAME}.import`,
      async () => {
        const bundle = findPolicyBundle(input.bundle)
        if (!bundle) {
          throw new InvalidRequestError(
            'unknown_bundle',
            'There is no bundle with this name.',
          )
        }
        this.checkEffectiveFrom(input.effectiveFrom)
        await this.assertBundleConcepts(
          tenantId,
          bundle.flatMap((policy) => [
            policy.leave_type,
            ...policy.employment_types,
          ]),
        )
        const run = (): Promise<ImportLeavePoliciesResult> =>
          this.transactions.run(async () => {
            let created = 0
            let skipped = 0
            // One after another: a transaction session does not allow parallel operations.
            for (const { leave_type, ...fields } of bundle) {
              if (
                await this.policies.findByTypeAndDate(
                  tenantId,
                  leave_type,
                  input.effectiveFrom,
                )
              ) {
                skipped += 1
                continue
              }
              await this.policies.create({
                tenant_id: tenantId,
                leave_type: { ...leave_type },
                effective_from: input.effectiveFrom,
                ...structuredClone(fields),
                source: { kind: 'bundle', bundle_id: input.bundle },
              })
              created += 1
            }
            return { created, skipped }
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, run)
            : run())
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw this.exists()
          }
          throw error
        }
      },
      'log',
      ({ created, skipped }) => ({ created, skipped }),
    )
  }

  /**
   * Checks a start date: a real date from 2000-01-01, today or later in UTC (HR plan 8.1 LP2).
   *
   * @param date - The date as sent.
   * @throws InvalidRequestError `invalid_date` or `effective_in_past`.
   */
  private checkEffectiveFrom(date: unknown): void {
    if (!isLocalDate(date) || date < FIRST_EFFECTIVE_DATE) {
      throw new InvalidRequestError(
        'invalid_date',
        'The start date must be a real date from 2000-01-01.',
      )
    }
    if (date < todayUtc()) {
      throw new InvalidRequestError(
        'effective_in_past',
        'A version cannot start in the past, so past decisions keep their rules.',
      )
    }
  }

  /**
   * Checks that every listed employment type is an active code.
   *
   * @param tenantId - Tenant of the caller.
   * @param types - The codes, already shape-checked.
   * @throws InvalidRequestError `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async assertEmploymentTypes(
    tenantId: string,
    types: Coding[],
  ): Promise<void> {
    // One after another: the in-memory and the Mongo read are cheap and ordered errors are stable.
    for (const type of types) {
      await this.concepts.assertActive(tenantId, type)
    }
  }

  /**
   * Checks that every concept a bundle refers to exists and is active, before anything is written.
   *
   * @param tenantId - Tenant of the caller.
   * @param codings - The leave types and employment types of the bundle.
   * @throws InvalidRequestError `concepts_missing`.
   */
  private async assertBundleConcepts(
    tenantId: string,
    codings: Coding[],
  ): Promise<void> {
    const seen = new Set<string>()
    for (const coding of codings) {
      const key = `${coding.system}|${coding.code}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      const concept = await this.concepts.resolve(
        tenantId,
        coding.system,
        coding.code,
      )
      if (!concept || concept.status !== 'active') {
        throw new InvalidRequestError(
          'concepts_missing',
          'Import the code concept bundle first: a leave type or employment type of the bundle is missing or retired.',
        )
      }
    }
  }

  /**
   * Loads a policy of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Policy identifier.
   * @returns The policy.
   * @throws NotFoundError `leave_policy_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<LeavePolicy> {
    const policy = await this.policies.findOne(id)
    if (!policy || policy.tenant_id !== tenantId || policy.deleted_at) {
      throw new NotFoundError(
        'leave_policy_not_found',
        'The leave policy was not found.',
      )
    }
    return policy
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @param onConflict - The error a repository conflict means for this write.
   * @returns What the call returns.
   */
  private async write(
    reason: string | undefined,
    write: () => Promise<LeavePolicy>,
    onConflict: () => ConflictError,
  ): Promise<LeavePolicy> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw onConflict()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw new NotFoundError(
          'leave_policy_not_found',
          'The leave policy was not found.',
        )
      }
      throw error
    }
  }

  /**
   * @returns The conflict for a second version on the same date.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'policy_exists',
      'This leave type already has a version that starts on this date.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The policy was changed by someone else. Reload it and try again.',
    )
  }
}
