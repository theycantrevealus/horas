import { MasterItemSupplierService } from '@core/master/master.item.supplier.service'
import { Authorization } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { GlobalResponse } from '@utility/dto/response'

@Controller('master')
export class MasterItemSupplierController {
  private masterItemSupplierService: MasterItemSupplierService
  constructor(masterItemSupplierService: MasterItemSupplierService) {
    this.masterItemSupplierService = masterItemSupplierService
  }

  @Post('/supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item supplier',
    description: ``,
  })
  async add(@Body() parameter): Promise<GlobalResponse> {
    return await this.masterItemSupplierService.add(parameter)
  }
}
