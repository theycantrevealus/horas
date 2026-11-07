import { Injectable } from '@nestjs/common'

/**
 * Starter service of the worker application.
 */
@Injectable()
export class WorkerService {
  /**
   * Returns the starter greeting message.
   *
   * @returns The greeting text.
   */
  getHello(): string {
    return 'Hello World!'
  }
}
