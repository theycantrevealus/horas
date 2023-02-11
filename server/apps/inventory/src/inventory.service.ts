import { Injectable } from '@nestjs/common'

@Injectable()
export class InventoryService {
  //=================================== MATERIAL REQUISITION
  async add_material_requisition() {}

  async approve_material_requisition() {}

  async decline_material_requisition() {}

  //=================================== PURCHASE ORDER

  async add_puchase_order() {}

  async approve_purchase_order() {}

  //=================================== DELIVERY ORDER

  async add_delivery_order() {}

  async approve_delivery_order() {}

  //=================================== RECEIVED NOTE

  async add_receive_note() {}

  //=================================== GENERAL

  async mutation() {}

  //=================================== LOGGING

  async log_stock() {}
}
