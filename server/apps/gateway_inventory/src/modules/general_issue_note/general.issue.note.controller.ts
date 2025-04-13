import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyRequest } from 'fastify'

import { GeneralIssueNoteAddDTO } from './dto/general.issue.note'
import { GeneralIssueNoteService } from './general.issue.note.service'

@Controller('inventory')
@ApiTags('General Issue Note')
export class GeneralIssueNoteController {
  constructor(
    @Inject(GeneralIssueNoteService)
    private readonly generalIssueNoteService: GeneralIssueNoteService
  ) {}

  @Post('general_issue_note')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: GeneralIssueNoteAddDTO,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.generalIssueNoteService.add(
      parameter,
      account,
      request.headers.authorization
    )
  }
}
