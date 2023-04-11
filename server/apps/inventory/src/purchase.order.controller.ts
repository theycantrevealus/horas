import { PurchaseOrderService } from '@inventory/purchase.order.service'
import { Controller, Inject } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ApiTags } from '@nestjs/swagger'

@Controller('inventory')
@ApiTags('Purchase Order')
export class PurchaseOrderController {
  constructor(
    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService
  ) {}

  @MessagePattern('purchase_order')
  async proceed(@Payload() payload) {
    switch (payload.action) {
      case 'add':
        await this.purchaseOrderService.add(
          payload.id,
          payload.data,
          payload.account
        )
        break
      case 'edit':
        await this.purchaseOrderService.edit(payload.data, payload.id)
        break
      case 'delete':
        await this.purchaseOrderService.delete(payload.id)
        break
      case 'ask_approval':
        await this.purchaseOrderService.askApproval(
          payload.data,
          payload.id,
          payload.account
        )
        break
      case 'approve':
        await this.purchaseOrderService.approve(
          payload.data,
          payload.id,
          payload.account
        )
        break
      case 'decline':
        await this.purchaseOrderService.decline(
          payload.data,
          payload.id,
          payload.account
        )
        break
    }
  }
}
