import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterReceptionistCounterAddDTO,
  MasterReceptionistCounterEditDTO,
} from '@gateway_core/master/dto/master.receptionist.counter'
import { MasterReceptionistCounterService } from '@gateway_core/master/services/master.receptionist.counter.service'
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
@ApiTags('Master Data Receptionist Counter Management')
export class MasterReceptionistCounterController {
  constructor(
    @Inject(MasterReceptionistCounterService)
    private readonly masterReceptionistCounterService: MasterReceptionistCounterService
  ) {}

  @Get('receptionist_counter')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterReceptionistCounter', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterReceptionistCounterService.all(parameter)
  }

  @Get('receptionist_counter/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterReceptionistCounter', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterReceptionistCounterService.detail(param.id)
  }

  @Post('receptionist_counter')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterReceptionistCounter', action: 'add' })
  @ApiOperation({
    summary: 'Add new data',
    description: ``,
  })
  async add(
    @Body() parameter: MasterReceptionistCounterAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.masterReceptionistCounterService.add(parameter, account)
  }

  @Patch('receptionist_counter/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterReceptionistCounter', action: 'edit' })
  @ApiOperation({
    summary: 'Edit item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MasterReceptionistCounterEditDTO,
    @Param() param: any
  ) {
    return await this.masterReceptionistCounterService.edit(parameter, param.id)
  }

  @Delete('receptionist_counter/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterReceptionistCounter', action: 'delete' })
  @ApiOperation({
    summary: 'Delete item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterReceptionistCounterService.delete(param.id)
  }
}
