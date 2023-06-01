import { LicenseService } from '@core/license/license.service'
import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'

@Controller('license')
export class LicenseController {
  constructor(
    @Inject(LicenseService) private readonly licenseService: LicenseService
  ) {}

  @Post()
  @ApiProperty({
    name: '',
  })
  async add(@Body() parameter) {
    // return await this.licenseService.add(parameter)
  }
}
