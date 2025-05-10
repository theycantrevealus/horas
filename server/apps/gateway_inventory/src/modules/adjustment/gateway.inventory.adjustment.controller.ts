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

import { StockAdjustmentAddDTO, StockAdjustmentEditDTO } from './dto/adjustment'
import { StockAdjustmentApprovalDTO } from './dto/adjustment.approval'
import { GatewayInventoryStockAdjustmentService } from './gateway.inventory.adjustment.service'

@Controller('inventory')
@ApiTags('Adjustment')
export class GatewayInventoryStockAdjustmentController {
  constructor(
    @Inject(GatewayInventoryStockAdjustmentService)
    private readonly gatewayInventoryAdjustmentService: GatewayInventoryStockAdjustmentService
  ) {}

  @Get('adjustment')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.gatewayInventoryAdjustmentService.all(parameter)
  }

  @Get('adjustment/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryAdjustmentService.detail(param.id)
  }

  @Post('adjustment')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: StockAdjustmentAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryAdjustmentService.add(parameter, account)
  }

  @Patch('adjustment/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: StockAdjustmentEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryAdjustmentService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('adjustment/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryAdjustmentService.delete(
      param.id,
      account
    )
  }

  @Patch('adjustment/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: StockAdjustmentApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAdjustmentService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAdjustmentService.notifier(
          {
            transaction_id: param.id,
            message: 'Adjustment need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('adjustment/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: StockAdjustmentApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAdjustmentService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAdjustmentService.notifier(
          {
            transaction_id: param.id,
            message: 'Adjustment approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('adjustment/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: StockAdjustmentApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAdjustmentService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAdjustmentService.notifier(
          {
            transaction_id: param.id,
            message: 'Adjustment declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('adjustment/process/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAdjustment', action: 'process' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Process adjustment',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async process(
    @Body() parameter: StockAdjustmentApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAdjustmentService
      .process(parameter, param.id, account, request.headers.authorization)
      .then(async (result) => {
        await this.gatewayInventoryAdjustmentService.notifier(
          {
            transaction_id: param.id,
            message: 'Adjustment processing',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }
}
