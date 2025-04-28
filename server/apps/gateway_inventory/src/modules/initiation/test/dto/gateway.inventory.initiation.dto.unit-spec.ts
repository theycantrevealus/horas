import { faker } from '@faker-js/faker'
import {
  StockInitiationAddDTO,
  StockInitiationEditDTO,
} from '@gateway_inventory/initiation/dto/initiation'
import { StockInitiationApprovalDTO } from '@gateway_inventory/initiation/dto/initiation.approval'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: StockInitiationAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
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
      targetClass: StockInitiationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
            },
            qty: 10,
            type: 'Expired Products',
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
      targetClass: StockInitiationEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        stock_point: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        detail: [
          {
            batch: {
              id: 'item_batch-xxxxx',
              code: faker.string.alpha({ length: 5, casing: 'upper' }),
              item: {
                id: 'item-xxxxxx',
                code: faker.string.alpha({ length: 5, casing: 'upper' }),
                name: 'Item 1',
                brand: null,
              },
              price_buy: 10000,
              price_sell: 120000,
              expired: new Date(),
            },
            qty: 10,
            type: 'Expired Products',
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
      targetClass: StockInitiationApprovalDTO,
      testType: -1,
      data: {
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: StockInitiationApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: StockInitiationApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: StockInitiationApprovalDTO,
      testType: 1,
      data: {
        remark: '-',
        __v: 0,
      },
    },
  ],
}
describe('Stock Initiation DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Stock Initiation Add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Stock Initiation Edit'), () => {
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

  describe(testCaption('APPROVAL', 'data', 'Stock Initiation Approval'), () => {
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
