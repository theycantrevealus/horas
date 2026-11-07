import { Controller, Get } from '@nestjs/common'
import { WorkerService } from './worker.service'

/**
 * Root HTTP controller of the worker service.
 */
@Controller()
export class WorkerController {
  /**
   * @param workerService - Service that provides the worker responses.
   */
  constructor(private readonly workerService: WorkerService) {}

  /**
   * Handles `GET /`.
   *
   * @returns The starter greeting message.
   */
  @Get()
  getHello(): string {
    return this.workerService.getHello()
  }
}
