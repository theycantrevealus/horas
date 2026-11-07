import { Inject, Injectable } from '@nestjs/common'
import { type LovRepository } from '@repository/interface/lov'
import { type LOV } from '@repository/model/lov'
import { REPOSITORY_LOV } from '@repository/token'
import { RepositoryError } from '@utility/database/error'
import { AppLogger } from '@utility/logger/service'

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
   * Returns the active LOVs of one group.
   * Logs one entry per call with the outcome, duration and, on failure, whether a retry can help.
   * The context (`GatewayBackOfficeService`) and `correlationId` are added automatically.
   *
   * @param groupName - Group to read.
   * @returns The group's LOVs.
   * @throws RepositoryError when the data layer fails; the error is logged and rethrown unchanged.
   */
  async getLovByGroup(groupName: string): Promise<LOV[]> {
    const operation = `${GatewayBackOfficeService.name}.getLovByGroup`
    const startedAt = performance.now()

    try {
      const lovs = await this.lov.findByGroup(groupName)
      this.logger.debug({
        event: 'lov_read',
        operation,
        outcome: 'success',
        groupName,
        count: lovs.length,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return lovs
    } catch (error: unknown) {
      this.logger.error({
        event: 'lov_read',
        operation,
        outcome: 'failure',
        groupName,
        error: error instanceof Error ? error.name : 'UnknownError',
        retryable: error instanceof RepositoryError && error.retryable,
        durationMs: Math.round(performance.now() - startedAt),
      })
      throw error
    }
  }
}
