import { Inject, Injectable, Logger, Scope } from '@nestjs/common'
import { INQUIRER } from '@nestjs/core'

/**
 * Logger to inject into services, controllers and filters.
 * Each consumer gets its own instance (transient scope) whose context is the consumer's class
 * name, so entries carry `context` without the class passing its name.
 * It only holds that name: every call is forwarded to the shared logger installed by
 * `app.useLogger`, so injecting it creates no new winston logger, transport or file handle.
 * Nest's `Logger` methods apply (`log`, `error`, `warn`, `debug`, `verbose`, `fatal`).
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends Logger {
  /**
   * @param inquirer - The class instance that asked for this logger; Nest sets it for transient providers.
   */
  constructor(@Inject(INQUIRER) inquirer?: object) {
    super(inquirer?.constructor?.name ?? 'Application')
  }
}
