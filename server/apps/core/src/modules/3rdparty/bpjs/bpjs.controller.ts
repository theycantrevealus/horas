import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { Controller, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BpjsController {
  constructor(
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
}
