import { faker } from '@faker-js/faker'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderEditDTO,
} from '@gateway_inventory/purchase_order/dto/purchase.order'
import { PurchaseOrderApprovalDTO } from '@gateway_inventory/purchase_order/dto/purchase.order.approval'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'supplier should not be empty',
      targetClass: PurchaseOrderAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        supplier: '',
        purchase_date: new Date(),
      },
    },
    {
      expectedToContain: 'supplier must be a string',
      targetClass: PurchaseOrderAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        supplier: 123,
        purchase_date: new Date(),
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseOrderAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        supplier: '123',
        purchase_date: new Date(),
        purchase_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            price: 10,
            discount_type: 'n',
            discount_value: 0,
            remark: '',
          },
        ],
        discount_type: 'n',
        discount_value: 0,
        extras: {},
        remark: '-',
      },
    },
  ],
  edit: [
    {
      expectedToContain: '__v should not be empty',
      targetClass: PurchaseOrderEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        supplier: '123',
        purchase_date: new Date(),
        purchase_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            price: 10,
            discount_type: 'n',
            discount_value: 0,
            remark: '',
          },
        ],
        discount_type: 'n',
        discount_value: 0,
        extras: {},
        remark: '',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: PurchaseOrderEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        supplier: '123',
        purchase_date: new Date(),
        purchase_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            price: 10,
            discount_type: 'n',
            discount_value: 0,
            remark: '',
          },
        ],
        discount_type: 'n',
        discount_value: 0,
        extras: {},
        remark: '',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseOrderEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        supplier: '123',
        purchase_date: new Date(),
        purchase_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            price: 10,
            discount_type: 'n',
            discount_value: 0,
            remark: '',
          },
        ],
        discount_type: 'n',
        discount_value: 0,
        extras: {},
        remark: '-',
        __v: 0,
      },
    },
  ],
  approval: [
    {
      expectedToContain: 'remark should not be empty',
      targetClass: PurchaseOrderApprovalDTO,
      testType: -1,
      data: {
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: PurchaseOrderApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: PurchaseOrderApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseOrderApprovalDTO,
      testType: 1,
      data: {
        remark: '-',
        __v: 0,
      },
    },
  ],
}
describe('Purchase Order DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Stock Audit Add'), () => {
    for (const tKey of falseCasePayload.add) {
      it(
        testCaption(
          tKey.testType < 0 ? 'NEGATIVE' : 'POSITIVE',
          'data',
          `${tKey.expectedToContain}`,
          {
            tab: 1,
          }
        ),
        async () => {
          const ofImportDto = plainToInstance(tKey.targetClass, tKey.data)
          const errors = await validate(ofImportDto)
          if (tKey.testType < 0) {
            expect(errors.length).not.toBe(0)
            expect(JSON.stringify(errors)).toContain(tKey.expectedToContain)
          } else {
            expect(errors.length).toBe(0)
          }
        }
      )
    }
  })

  describe(testCaption('EDIT', 'data', 'Stock Audit Edit'), () => {
    for (const tKey of falseCasePayload.edit) {
      it(
        testCaption(
          tKey.testType < 0 ? 'NEGATIVE' : 'POSITIVE',
          'data',
          `${tKey.expectedToContain}`,
          {
            tab: 1,
          }
        ),
        async () => {
          const ofImportDto = plainToInstance(tKey.targetClass, tKey.data)
          const errors = await validate(ofImportDto)
          if (tKey.testType < 0) {
            expect(errors.length).not.toBe(0)
            expect(JSON.stringify(errors)).toContain(tKey.expectedToContain)
          } else {
            expect(errors.length).toBe(0)
          }
        }
      )
    }
  })

  describe(testCaption('APPROVAL', 'data', 'Stock Audit Approval'), () => {
    for (const tKey of falseCasePayload.approval) {
      it(
        testCaption(
          tKey.testType < 0 ? 'NEGATIVE' : 'POSITIVE',
          'data',
          `${tKey.expectedToContain}`,
          {
            tab: 1,
          }
        ),
        async () => {
          const ofImportDto = plainToInstance(tKey.targetClass, tKey.data)
          const errors = await validate(ofImportDto)
          if (tKey.testType < 0) {
            expect(errors.length).not.toBe(0)
            expect(JSON.stringify(errors)).toContain(tKey.expectedToContain)
          } else {
            expect(errors.length).toBe(0)
          }
        }
      )
    }
  })
})
