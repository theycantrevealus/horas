import { Authorization, CredentialAccount } from '@decorators/authorization'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@gateway_core/master/dto/master.item.unit'
import { MasterItemUnitService } from '@gateway_core/master/services/master.item.unit.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'

@Controller('master')
@ApiTags('Master Data Item Unit Management')
export class MasterItemUnitController {
  constructor(
    @Inject(MasterItemUnitService)
    private readonly masterItemUnitService: MasterItemUnitService
  ) {}

  @Get('unit')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing unit data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemUnitService.all(parameter)
  }

  @Get('unit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterItemUnitService.detail(param.id)
  }

  @Post('unit')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item unit',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemUnitAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.masterItemUnitService.add(parameter, account)
  }

  @Patch('unit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item unit',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemUnitEditDTO, @Param() param: any) {
    return await this.masterItemUnitService.edit(parameter, param.id)
  }

  @Delete('unit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item unit',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterItemUnitService.delete(param.id)
  }
}
