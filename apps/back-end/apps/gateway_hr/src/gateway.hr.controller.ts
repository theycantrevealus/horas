import { Controller, Get } from '@nestjs/common'
import { Public } from '@identity/guard/decorators'

/**
 * Answer of the health check.
 *
 * @property status - Always `ok` while the process serves requests.
 */
export interface HealthReply {
  status: 'ok'
}

/**
 * Root HTTP controller of the HR gateway.
 */
@Controller({ path: 'health', version: '1' })
export class GatewayHrController {
  /**
   * Handles `GET /v1/health`: tells a load balancer that the process is up. It checks no
   * dependency and needs no sign-in.
   *
   * @returns The health reply.
   */
  @Public()
  @Get()
  health(): HealthReply {
    return { status: 'ok' }
  }
}
