import { faker } from '@faker-js/faker'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@gateway_core/master/dto/master.item'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { Types } from 'mongoose'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'configuration should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'storing should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'category should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'brand should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
    {
      expectedToContain: 'unit should not be empty',
      targetClass: MasterItemAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterItemAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'configuration should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'storing should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'category should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'brand should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: 'unit should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterItemEditDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterItemEditDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        name: faker.commerce.productName(),
        configuration: {
          allow_sell: true,
        },
        storing: {
          stock_point: {
            id: `stock_point_${new Types.ObjectId().toString()}`,
            code: faker.commerce.isbn({ variant: 13, separator: '-' }),
            name: faker.company.name(),
          },
          storing_label: faker.commerce.isbn({ variant: 13, separator: '/' }),
          minimum: 0,
          maximum: 100,
        },
        category: [
          {
            id: `category_${new Types.ObjectId().toString()}`,
            code: faker.string.alpha({ length: 5, casing: 'upper' }),
            name: faker.commerce.productMaterial(),
          },
        ],
        brand: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.company.name(),
        },
        unit: {
          id: `brand_${new Types.ObjectId().toString()}`,
          code: faker.string.alpha({ length: 5, casing: 'upper' }),
          name: faker.commerce.productMaterial(),
        },
        __v: 0,
      },
    },
  ],
}
describe('Master Item DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master item add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Master item edit'), () => {
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
})
