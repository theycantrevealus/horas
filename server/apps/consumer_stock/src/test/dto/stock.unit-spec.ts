import { StockDTO } from '@consumer_stock/dto/stock.dto'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'Correct data',
      targetClass: StockDTO,
      testType: 1,
      data: {
        item: {
          id: '',
          code: '',
          name: '',
          brand: {
            id: '',
            code: '',
            name: '',
          },
        },
        batch: {
          id: '',
          code: '',
          item: {
            id: '',
            code: '',
            name: '',
            brand: {
              id: '',
              code: '',
              name: '',
            },
          },
          price_buy: 10,
          price_sell: 11,
          expired: new Date(),
        },
        stock_point: {},
        qty: 10,
      },
    },
  ],
}
describe('Stock DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Stock data'), () => {
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
