import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type HrImportRepository } from '@repository/interface/hr-import'
import { type HrImport } from '@repository/model/hr-import'
import { REPOSITORY_HR_IMPORT } from '@repository/token'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'

const NAME = 'HrImportService'

/**
 * Optional version and reason of a cancellation.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface CancelImportInput {
  version?: number
  reason?: string
}

/**
 * The two reads and writes every file import needs, whatever its kind (HR plan 5.6): view an
 * import, and cancel a checked one. Holiday and roster imports are both served.
 */
@Injectable()
export class HrImportService {
  /**
   * @param imports - HR import repository.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_HR_IMPORT) private readonly imports: HrImportRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Returns one import with its status, counts and row errors. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Import identifier.
   * @returns The import.
   * @throws NotFoundError `import_not_found`.
   */
  get(tenantId: string, id: string): Promise<HrImport> {
    return this.load(tenantId, id)
  }

  /**
   * Discards a checked import so it can no longer be applied (HR plan 5.6 IM14). Nothing is
   * deleted.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Import identifier.
   * @param input - Optional version and reason.
   * @returns The cancelled import.
   * @throws NotFoundError `import_not_found`.
   * @throws InvalidRequestError `invalid_transition`.
   * @throws ConflictError `stale_version`.
   */
  cancel(
    tenantId: string,
    id: string,
    input: CancelImportInput,
  ): Promise<HrImport> {
    return observe(
      this.logger,
      'hr_import_cancel',
      `${NAME}.cancel`,
      async () => {
        const current = await this.load(tenantId, id)
        if (current.status !== 'validated' && current.status !== 'invalid') {
          throw new InvalidRequestError(
            'invalid_transition',
            'Only a checked import can be cancelled.',
          )
        }
        if (input.version !== undefined && input.version !== current.version) {
          throw this.stale()
        }
        const write = (): Promise<HrImport> =>
          this.imports.update(
            current.id,
            { status: 'cancelled' },
            { expectedVersion: current.version },
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
      'log',
      (result) => ({ status: result.status }),
    )
  }

  /**
   * Loads an import of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Import identifier.
   * @returns The import.
   * @throws NotFoundError `import_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<HrImport> {
    const record = await this.imports.findOne(id)
    if (!record || record.tenant_id !== tenantId || record.deleted_at) {
      throw this.notFound()
    }
    return record
  }

  /**
   * @returns The not-found error for an import.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('import_not_found', 'The import was not found.')
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The import was changed by someone else. Reload it and try again.',
    )
  }
}
