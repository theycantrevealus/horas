import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { AppLogger } from '@utility/logger/service'
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { type LeaveRequestDetailRepository } from '@repository/interface/leave-request-detail'
import { type FileRef } from '@repository/model/common/file-ref'
import { type LeaveRequest } from '@repository/model/leave-request'
import {
  REPOSITORY_LEAVE_REQUEST,
  REPOSITORY_LEAVE_REQUEST_DETAIL,
} from '@repository/token'
import { isValidDocumentRef } from '../license/license-rules'
import { observe } from '../observe'
import { ConflictError, InvalidRequestError } from '../workforce.error'
import { LeaveDeciderService } from './decider'
import {
  isFirstDecider,
  isRequester,
  leaveRequestNotFound,
} from './leave-access'
import { type LeaveCaller } from './leave-caller'

const NAME = 'LeaveDetailService'

/**
 * Entity name of the detail in the change history.
 */
const ENTITY_TYPE = 'leave_request_detail'

/**
 * Statuses in which proof can still be given.
 */
const PROOF_STATUSES: LeaveRequest['status'][] = [
  'requested',
  'head_approved',
  'approved',
]

/**
 * The reason and proof of a request.
 *
 * @property reason - The requester's reason.
 * @property proof - Proof (a file reference), or `null`.
 */
export interface LeaveDetailView {
  reason: string
  proof: FileRef | null
}

/**
 * The highly confidential part of a leave request (HR plan 8.3): reading the reason and proof, and
 * attaching the proof. Everyone but the requester, the Head who decides, HR Manager and a holder of
 * `workforce.leave-request:read-details` gets the answer of a missing request.
 */
@Injectable()
export class LeaveDetailService {
  /**
   * @param requests - Leave request repository.
   * @param details - Leave request detail repository.
   * @param decider - Finds the Head who decides a request.
   * @param changes - Change recorder, for the access record of reads (`HR-AUD-003`).
   * @param transactions - Transaction manager, so the proof and the request change together.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_LEAVE_REQUEST)
    private readonly requests: LeaveRequestRepository,
    @Inject(REPOSITORY_LEAVE_REQUEST_DETAIL)
    private readonly details: LeaveRequestDetailRepository,
    @Inject(LeaveDeciderService) private readonly decider: LeaveDeciderService,
    @Inject(CHANGE_RECORDER) private readonly changes: ChangeRecorder,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Reads the reason and proof of a request and records the access in the change log (`HR-AUD-003`,
   * `HR-LEV-041`). If the access cannot be recorded, nothing is returned. Writes no operational log
   * entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param caller - The caller.
   * @returns The reason and the proof.
   * @throws NotFoundError `leave_request_not_found` for a missing, foreign or malformed request and
   * for a caller who may not read the detail.
   */
  async read(
    tenantId: string,
    id: string,
    caller: LeaveCaller,
  ): Promise<LeaveDetailView> {
    const request = await this.load(tenantId, id)
    if (
      !(
        isRequester(caller, request) ||
        caller.canReadDetails ||
        caller.canApproveHr ||
        (await isFirstDecider(this.decider, tenantId, caller, request))
      )
    ) {
      throw leaveRequestNotFound()
    }
    const detail = await this.details.findByRequest(tenantId, request.id)
    if (!detail) {
      throw leaveRequestNotFound()
    }
    await this.changes.recordAccess({
      type: ENTITY_TYPE,
      id: detail.id,
      operation: `${NAME}.read`,
      tenantId,
    })
    return { reason: detail.reason, proof: detail.proof }
  }

  /**
   * Attaches the proof to a request and marks it received (HR plan 8.3 LR11). The requester or a
   * holder of `workforce.leave-request:write` may; another proof replaces the first, and the change
   * history keeps both.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @param proof - Reference to the file.
   * @param caller - The caller.
   * @param version - Version of the request the caller read.
   * @returns The request, without the proof.
   * @throws NotFoundError `leave_request_not_found`.
   * @throws InvalidRequestError `proof_not_allowed` for a rejected or cancelled request, or
   * `invalid_proof`.
   * @throws ConflictError `stale_version`.
   */
  attachProof(
    tenantId: string,
    id: string,
    proof: FileRef,
    caller: LeaveCaller,
    version?: number,
  ): Promise<LeaveRequest> {
    return observe(
      this.logger,
      'leave_proof_attach',
      `${NAME}.attachProof`,
      async () => {
        const request = await this.load(tenantId, id)
        if (!(isRequester(caller, request) || caller.canWrite)) {
          throw leaveRequestNotFound()
        }
        if (!PROOF_STATUSES.includes(request.status)) {
          throw new InvalidRequestError(
            'proof_not_allowed',
            'Proof cannot be given for a request that was rejected or cancelled.',
          )
        }
        if (!isValidDocumentRef(proof)) {
          throw new InvalidRequestError(
            'invalid_proof',
            'The proof needs a file identifier, an accepted content type and a SHA-256 hash.',
          )
        }
        if (version !== undefined && version !== request.version) {
          throw this.stale()
        }
        const detail = await this.details.findByRequest(tenantId, request.id)
        if (!detail) {
          throw leaveRequestNotFound()
        }
        try {
          return await this.transactions.run(async () => {
            await this.details.update(detail.id, {
              proof: {
                file_id: proof.file_id,
                content_type: proof.content_type,
                sha256: proof.sha256,
              },
            })
            return this.requests.update(
              request.id,
              { proof_received: true },
              { expectedVersion: version },
            )
          })
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw this.stale()
          }
          if (error instanceof RepositoryNotFoundError) {
            throw leaveRequestNotFound()
          }
          throw error
        }
      },
    )
  }

  /**
   * Loads a request of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Request identifier.
   * @returns The request.
   * @throws NotFoundError `leave_request_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<LeaveRequest> {
    const request = await this.requests.findOne(id)
    if (!request || request.tenant_id !== tenantId || request.deleted_at) {
      throw leaveRequestNotFound()
    }
    return request
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The request was changed by someone else. Reload it and try again.',
    )
  }
}
