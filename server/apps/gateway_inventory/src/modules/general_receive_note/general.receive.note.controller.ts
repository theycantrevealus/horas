import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
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

import { GeneralReceiveNoteAddDTO } from './dto/general.receive.note.dto'
import { GatewayInventoryGeneralReceiveNoteService } from './general.receive.note.service'

@Controller('inventory')
@ApiTags('General Receive Note')
export class GatewayInventoryGeneralReceiveNoteController {
  constructor(
    @Inject(GatewayInventoryGeneralReceiveNoteService)
    private readonly generalReceiveNoteService: GatewayInventoryGeneralReceiveNoteService
  ) {}

  @Get('general_receive_note')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'GeneralReceiveNote', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.generalReceiveNoteService.all(parameter)
  }

  @Get('general_receive_note/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'GeneralReceiveNote', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param: any) {
    return await this.generalReceiveNoteService.detail(param.id)
  }

  @Post('general_receive_note')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'GeneralReceiveNote', action: 'add' })
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: GeneralReceiveNoteAddDTO,
    @CredentialAccount() account: IAccount,
    @Req() request: any
  ) {
    return await this.generalReceiveNoteService.add(
      parameter,
      account,
      request.headers.authorization
    )
  }
}
