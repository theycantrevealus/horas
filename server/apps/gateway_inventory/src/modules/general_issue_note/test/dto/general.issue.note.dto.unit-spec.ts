import { faker } from '@faker-js/faker'
import { GeneralIssueNoteAddDTO } from '@gateway_inventory/general_issue_note/dto/general.issue.note'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'code must be longer than or equal to 8 characters',
      targetClass: GeneralIssueNoteAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 5, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: 'material_requisition-xxxxx',
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
            issued: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '',
      },
    },
    {
      expectedToContain: 'code must be shorter than or equal to 24 characters',
      targetClass: GeneralIssueNoteAddDTO,
      testType: -1,
      data: {
        code: faker.string.alpha({ length: 25, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: 'material_requisition-xxxxx',
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
            issued: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: GeneralIssueNoteAddDTO,
      testType: 1,
      data: {
        code: faker.string.alpha({ length: 24, casing: 'upper' }),
        transaction_date: new Date(),
        material_requisition: 'material_requisition-xxxxx',
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
            issued: 10,
            remark: '',
          },
        ],
        extras: {},
        remark: '',
      },
    },
  ],
}
describe('General Issue Noted DTO Test', () => {
  describe(testCaption('ADD', 'data', 'General Issue Note Add'), () => {
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
})
