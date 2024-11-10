import { BPJSVClaimAuthService } from '@gateway_core/3rdparty/bpjs/services/vclaim/auth.service'
import { Controller, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BpjsController {
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
}
