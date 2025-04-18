import { faker } from '@faker-js/faker'
import {
  MutationAddDTO,
  MutationEditDTO,
} from '@gateway_inventory/mutation/dto/mutation'
import { MutationApprovalDTO } from '@gateway_inventory/mutation/dto/mutation.approval'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MutationAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MutationAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MutationAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
      targetClass: MutationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MutationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MutationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: MutationEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
        remark: '',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MutationEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        from: {
          id: 'stock_point-xxxx',
          code: 'STCKP-0001',
          name: 'Sample Stock Point',
        },
        to: {
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
  ],
  approval: [
    {
      expectedToContain: 'remark should not be empty',
      targetClass: MutationApprovalDTO,
      testType: -1,
      data: {
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MutationApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: MutationApprovalDTO,
      testType: -1,
      data: {
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MutationApprovalDTO,
      testType: 1,
      data: {
        remark: '-',
        __v: 0,
      },
    },
  ],
}
describe('Stock Mutation DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Stock Mutation Add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Stock Mutation Add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Stock Mutation Approval'), () => {
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
