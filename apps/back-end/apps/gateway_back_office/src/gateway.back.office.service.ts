import { Inject, Injectable } from '@nestjs/common'
import { type LovRepository } from '@repository/interface/lov'
import { type LOV } from '@repository/model/lov'
import { type EntityChanges, type NewEntity } from '@utility/database/interface'
import { REPOSITORY_LOV } from '@repository/token'
import { RepositoryError } from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'

/**
 * Data a caller provides to create a LOV.
 */
export type NewLov = NewEntity<LOV>

/**
 * Starter service of the API gateway.
 */
@Injectable()
export class GatewayBackOfficeService {
  /**
   * @param lov - LOV repository.
   * @param logger - Logger whose context is this class's name.
   */
  constructor(
    @Inject(REPOSITORY_LOV) private readonly lov: LovRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Returns the starter greeting message.
   *
   * @returns The greeting text.
   */
  getHello(): string {
    return 'Hello World!'
  }

  /**
   * Returns the active LOVs of one group. Reading data writes no log entry (`logging.md` 4.3):
   * a failure reaches the caller as the thrown error and is visible in the access log.
   *
   * @param groupName - Group to read.
   * @returns The group's LOVs.
   * @throws RepositoryError when the data layer fails.
   */
  getLovByGroup(groupName: string): Promise<LOV[]> {
    return this.lov.findByGroup(groupName)
  }

  /**
   * Creates a LOV. The acting account and the optional reason go to the change history.
   *
   * @param input - LOV data.
   * @param reason - Why the value is added, for the change history.
   * @returns The stored LOV.
   * @throws RepositoryConflictError when `set_value` already exists.
   */
  createLov(input: NewLov, reason?: string): Promise<LOV> {
    return this.writeLov('lov_create', 'createLov', () =>
      this.withReason(reason, () => this.lov.create(input)),
    )
  }

  /**
   * Changes a LOV.
   *
   * @param id - LOV identifier.
   * @param changes - Fields to change.
   * @param reason - Why the value changes, for the change history.
   * @returns The updated LOV.
   * @throws RepositoryNotFoundError when the LOV does not exist.
   */
  updateLov(
    id: string,
    changes: EntityChanges<LOV>,
    reason?: string,
  ): Promise<LOV> {
    return this.writeLov('lov_update', 'updateLov', () =>
      this.withReason(reason, () => this.lov.update(id, changes)),
    )
  }

  /**
   * Runs a LOV write and logs one entry about it: outcome, duration and, on failure, the error
   * class and whether a retry can help. The values written are never logged.
   *
   * @param event - Stable event name.
   * @param method - Method name, for the operation field.
   * @param work - The write.
   * @returns What `work` returns.
   */
  private async writeLov<T>(
    event: string,
    method: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const operation = `${GatewayBackOfficeService.name}.${method}`
    const startedAt = performance.now()
    try {
      const result = await work()
      this.logger.log({
        event,
        operation,
        outcome: 'success',
        durationMs: Math.round(performance.now() - startedAt),
      })
      return result
    } catch (error: unknown) {
      this.logger.warn({
        event,
        operation,
        outcome: 'failure',
        error: error instanceof Error ? error.name : 'UnknownError',
        retryable: error instanceof RepositoryError && error.retryable,
        durationMs: Math.round(performance.now() - startedAt),
      })
      throw error
    }
  }

  /**
   * Runs `work` with a change reason when one is given.
   *
   * @param reason - Why the data changes, or `undefined`.
   * @param work - Code that writes through repositories.
   * @returns What `work` returns.
   */
  private withReason<T>(reason: string | undefined, work: () => T): T {
    return reason ? withChangeReason(reason, work) : work()
  }
}
