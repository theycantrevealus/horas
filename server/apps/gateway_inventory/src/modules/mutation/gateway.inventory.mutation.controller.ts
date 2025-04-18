import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
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
import { FastifyRequest } from 'fastify'

import { MutationAddDTO, MutationEditDTO } from './dto/mutation'
import { MutationApprovalDTO } from './dto/mutation.approval'
import { GatewayInventoryMutationService } from './gateway.inventory.mutation.service'

@Controller('inventory')
@ApiTags('Mutation')
export class GatewayInventoryMutationController {
  constructor(
    @Inject(GatewayInventoryMutationService)
    private readonly gatewayInventoryMutationService: GatewayInventoryMutationService
  ) {}

  @Get('mutation')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Query('lazyEvent') parameter: string,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryMutationService.all(parameter, account)
  }

  @Get('mutation/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryMutationService.detail(param.id)
  }

  @Post('mutation')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: MutationAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryMutationService.add(parameter, account)
  }

  @Patch('mutation/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: MutationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryMutationService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryMutationService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('mutation/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: MutationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryMutationService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryMutationService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('mutation/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: MutationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryMutationService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryMutationService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('mutation/proceed/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'proceed' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async proceed(
    @Body() parameter: MutationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryMutationService
      .proceed(parameter, param.id, account, request.headers.authorization)
      .then(async (result) => {
        await this.gatewayInventoryMutationService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation is processing',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('mutation/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MutationEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryMutationService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('mutation/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryMutationService.delete(param.id, account)
  }
}
