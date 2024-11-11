import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import { GeneralReceiveNoteAddDTO } from '@inventory/dto/general.receive.note'
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
import { GlobalResponse } from '@utility/dto/response'
import { isJSON } from 'class-validator'

import { GeneralReceiveNoteService } from './general.receive.note.service'

@Controller('inventory')
@ApiTags('General Receive Note')
export class GeneralReceiveNoteController {
  constructor(
    @Inject(GeneralReceiveNoteService)
    private readonly generalReceiveNoteService: GeneralReceiveNoteService
  ) {}

  @Get('general_receive_note')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'GeneralReceiveNote', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.generalReceiveNoteService.all({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      })
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      }
    }
  }

  @Get('general_receive_note/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
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
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'GeneralReceiveNote', action: 'add' })
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: GeneralReceiveNoteAddDTO,
    @CredentialAccount() account: IAccountCreatedBy,
    @Req() request: any
  ): Promise<GlobalResponse> {
    return await this.generalReceiveNoteService.add(
      parameter,
      account,
      request.headers.authorization
    )
  }
}
