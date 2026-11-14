import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type EmployeeRepository } from '@repository/interface/employee'
import {
  type CpdRecordQuery,
  type CpdRecordRepository,
} from '@repository/interface/cpd-record'
import { type Coding } from '@repository/model/common/coding'
import { type FileRef } from '@repository/model/common/file-ref'
import { type CpdRecord } from '@repository/model/cpd-record'
import { type Employee } from '@repository/model/employee'
import { REPOSITORY_CPD_RECORD, REPOSITORY_EMPLOYEE } from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { isValidDocumentRef } from '../license/license-rules'
import { observe } from '../observe'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  isValidActivityDate,
  isValidPoints,
  MAX_REASON,
  MAX_TITLE,
} from './cpd-rules'

const NAME = 'CpdService'

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  credit: /(^|\.)credit-system$/,
  category: /(^|\.)cpd-category$/,
} as const

/**
 * Data of a new credit record.
 *
 * @property employeeId - The holder (ignored by the self-service route).
 * @property creditSystem - Credit system code.
 * @property activity - Title, category code and optional provider.
 * @property activityDate - When the activity was done.
 * @property points - Points, at most two decimals.
 * @property evidence - Reference to the proof; required for self-service.
 * @property reason - Why, kept in the change history.
 */
export interface RegisterCpdInput {
  employeeId?: string
  creditSystem: Coding
  activity: { title: string; category: Coding; provider?: string | null }
  activityDate: string
  points: number
  evidence?: FileRef | null
  reason?: string
}

/**
 * Data of a review.
 *
 * @property outcome - `accept` or `reject`.
 * @property reason - Why; required for a rejection.
 * @property version - Version the caller read.
 */
export interface ReviewCpdInput {
  outcome: 'accept' | 'reject'
  reason?: string
  version?: number
}

/**
 * Professional credit records (SKP, CME, CPD): recording, self-service submission, listing and
 * review (HR plan 3.2 B1). Never edits or deletes: a wrong record is rejected.
 */
@Injectable()
export class CpdService {
  /**
   * @param records - Credit record repository.
   * @param employees - Employee repository.
   * @param concepts - Code concepts, to check the credit system and the category.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CPD_RECORD)
    private readonly records: CpdRecordRepository,
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists an employee's credit records, newest activity first. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee identifier.
   * @param query - Optional filters and paging.
   * @returns The records.
   * @throws NotFoundError `employee_not_found`.
   */
  async listByEmployee(
    tenantId: string,
    employeeId: string,
    query: CpdRecordQuery,
  ): Promise<CpdRecord[]> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    return this.records.findByEmployee(tenantId, employee.id, query)
  }

  /**
   * HR records earned credits. The record is accepted at once (HR plan 3.2 CR7).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The record, with the holder's `employeeId`.
   * @returns The created record.
   * @throws InvalidRequestError See `register`.
   */
  create(tenantId: string, input: RegisterCpdInput): Promise<CpdRecord> {
    return observe(
      this.logger,
      'cpd_record_create',
      `${NAME}.create`,
      async () => {
        const employee = await this.employees.findOne(input.employeeId ?? '')
        if (!employee || employee.tenant_id !== tenantId) {
          throw new InvalidRequestError(
            'employee_not_found',
            'The employee was not found.',
          )
        }
        return this.register(tenantId, employee, input, false)
      },
    )
  }

  /**
   * The signed-in employee submits their own credits. The record is submitted for review and
   * needs evidence.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee linked to the signed-in account, or `null`.
   * @param input - The record; any `employeeId` in it is ignored.
   * @returns The created record.
   * @throws NotFoundError `employee_not_found` when the account has no employee.
   * @throws InvalidRequestError See `register`.
   */
  createOwn(
    tenantId: string,
    employeeId: string | null,
    input: RegisterCpdInput,
  ): Promise<CpdRecord> {
    return observe(
      this.logger,
      'cpd_record_submit',
      `${NAME}.createOwn`,
      async () => {
        const employee = employeeId
          ? await this.employees.findOne(employeeId)
          : null
        if (!employee || employee.tenant_id !== tenantId) {
          throw new NotFoundError(
            'employee_not_found',
            'The employee was not found.',
          )
        }
        return this.register(tenantId, employee, input, true)
      },
    )
  }

  /**
   * Accepts or rejects a record (HR plan 3.2 CR8). A submitted record becomes accepted or
   * rejected; an accepted one may later be rejected; a rejected one is final.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Record identifier.
   * @param input - Outcome, reason and optional version.
   * @param reviewerEmployeeId - The reviewer's own employee, or `null`; the holder cannot review.
   * @returns The reviewed record.
   * @throws NotFoundError `cpd_record_not_found`.
   * @throws ForbiddenError `reviewer_is_holder`.
   * @throws InvalidRequestError `invalid_transition`, `reason_required` or `invalid_reason`.
   * @throws ConflictError `stale_version`.
   */
  review(
    tenantId: string,
    id: string,
    input: ReviewCpdInput,
    reviewerEmployeeId: string | null,
  ): Promise<CpdRecord> {
    return observe(
      this.logger,
      'cpd_record_review',
      `${NAME}.review`,
      async () => {
        const record = await this.records.findOne(id)
        if (!record || record.tenant_id !== tenantId || record.deleted_at) {
          throw this.notFound()
        }
        if (reviewerEmployeeId !== null && reviewerEmployeeId === record.employee_id) {
          throw new ForbiddenError(
            'reviewer_is_holder',
            'A record cannot be reviewed by the person it belongs to.',
          )
        }
        const target = input.outcome === 'accept' ? 'accepted' : 'rejected'
        const allowed =
          record.status === 'submitted' ||
          (record.status === 'accepted' && target === 'rejected')
        if (!allowed) {
          throw new InvalidRequestError(
            'invalid_transition',
            'Only a submitted record can be accepted, and a submitted or accepted record rejected.',
          )
        }
        const reason = (input.reason ?? '').trim()
        if (reason.length > MAX_REASON) {
          throw new InvalidRequestError(
            'invalid_reason',
            'The reason can have at most 500 characters.',
          )
        }
        if (target === 'rejected' && reason.length === 0) {
          throw new InvalidRequestError(
            'reason_required',
            'A rejection needs a reason.',
          )
        }
        if (input.version !== undefined && input.version !== record.version) {
          throw this.stale()
        }
        const write = (): Promise<CpdRecord> =>
          this.records.update(
            record.id,
            { status: target },
            { expectedVersion: input.version },
          )
        try {
          return await (reason ? withChangeReason(reason, write) : write())
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
   * Checks and stores a new credit record (HR plan 3.2 CR1 to CR7).
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The holder.
   * @param input - The record.
   * @param selfService - Whether the employee submits their own credits.
   * @returns The stored record.
   * @throws InvalidRequestError `employee_separated`, `invalid_points`, `invalid_activity`,
   * `invalid_activity_date`, `invalid_document`, `evidence_required`, `invalid_credit_system`,
   * `invalid_category`, `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  private async register(
    tenantId: string,
    employee: Employee,
    input: RegisterCpdInput,
    selfService: boolean,
  ): Promise<CpdRecord> {
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated.',
      )
    }
    if (!isValidPoints(input.points)) {
      throw new InvalidRequestError(
        'invalid_points',
        'The points must be above 0, at most 500, with at most two decimals.',
      )
    }
    const title = input.activity.title.trim()
    const provider = (input.activity.provider ?? '').trim()
    if (
      title.length < 1 ||
      title.length > MAX_TITLE ||
      provider.length > MAX_TITLE
    ) {
      throw new InvalidRequestError(
        'invalid_activity',
        'The title needs 1 to 200 characters and the provider at most 200.',
      )
    }
    if (!isValidActivityDate(input.activityDate)) {
      throw new InvalidRequestError(
        'invalid_activity_date',
        'The date must be a real date from 1950-01-01 to tomorrow.',
      )
    }
    const evidence = input.evidence ?? null
    if (evidence !== null && !isValidDocumentRef(evidence)) {
      throw new InvalidRequestError(
        'invalid_document',
        'The evidence must have a file id, a PDF, JPEG or PNG content type and a SHA-256 hash.',
      )
    }
    if (selfService && evidence === null) {
      throw new InvalidRequestError(
        'evidence_required',
        'Credits you submit yourself need evidence.',
      )
    }
    if (!SYSTEMS.credit.test(input.creditSystem.system)) {
      throw new InvalidRequestError(
        'invalid_credit_system',
        'The credit system must come from a credit-system code system, for example id.credit-system.',
      )
    }
    if (!SYSTEMS.category.test(input.activity.category.system)) {
      throw new InvalidRequestError(
        'invalid_category',
        'The category must come from a cpd-category code system.',
      )
    }
    await this.concepts.assertActive(tenantId, input.creditSystem)
    await this.concepts.assertActive(tenantId, input.activity.category)

    const write = (): Promise<CpdRecord> =>
      this.records.create({
        tenant_id: tenantId,
        employee_id: employee.id,
        credit_system: {
          system: input.creditSystem.system,
          code: input.creditSystem.code,
        },
        activity: {
          title,
          category: {
            system: input.activity.category.system,
            code: input.activity.category.code,
          },
          provider: provider.length > 0 ? provider : null,
        },
        activity_date: input.activityDate,
        points: input.points,
        evidence: evidence
          ? {
              file_id: evidence.file_id,
              content_type: evidence.content_type,
              sha256: evidence.sha256.toLowerCase(),
            }
          : null,
        source: 'manual',
        status: selfService ? 'submitted' : 'accepted',
      })
    return input.reason ? withChangeReason(input.reason, write) : write()
  }

  /**
   * @returns The not-found error for a record.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'cpd_record_not_found',
      'The credit record was not found.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The record was changed by someone else. Reload it and try again.',
    )
  }
}
