import { faker } from '@faker-js/faker'
import {
  PurchaseRequisitionAddDTO,
  PurchaseRequisitionEditDTO,
} from '@gateway_inventory/purchase_requisition/dto/purchase.requisition'
import { PurchaseRequisitionApprovalDTO } from '@gateway_inventory/purchase_requisition/dto/purchase.requisition.approval'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: PurchaseRequisitionAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: PurchaseRequisitionAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseRequisitionAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: PurchaseRequisitionEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: PurchaseRequisitionEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: PurchaseRequisitionEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: PurchaseRequisitionEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseRequisitionEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: '-',
        detail: [
          {
            item: {
              id: 'item-xxxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              name: 'Item 1',
              brand: null,
            },
            qty: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '-',
        __v: 0,
      },
    },
  ],
  approval: [
    {
      expectedToContain: 'remark should not be empty',
      targetClass: PurchaseRequisitionApprovalDTO,
      testType: -1,
      data: {
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: PurchaseRequisitionApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: PurchaseRequisitionApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: PurchaseRequisitionApprovalDTO,
      testType: 1,
      data: {
        remark: '-',
        __v: 0,
      },
    },
  ],
}
describe('Purchase Requisition DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Purchase Requisition Add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Purchase Requisition Edit'), () => {
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

  describe(
    testCaption('APPROVAL', 'data', 'Purchase Requisition Approval'),
    () => {
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
    }
  )
})
