import { i18nAddDTO, i18nEditDTO } from '@gateway_core/i18n/dto/i18n'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'language_code should not be empty',
      targetClass: i18nAddDTO,
      testType: -1,
      data: {
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
    {
      expectedToContain: 'iso_2_digits should not be empty',
      targetClass: i18nAddDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
    {
      expectedToContain: 'iso_3_digits should not be empty',
      targetClass: i18nAddDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: i18nAddDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
    {
      expectedToContain: 'remark should not be empty',
      targetClass: i18nAddDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: i18nAddDTO,
      testType: 1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'language_code should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: 'iso_2_digits should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: 'iso_3_digits should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: 'name should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 0,
      },
    },
    {
      expectedToContain: 'remark should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
      },
    },
    {
      expectedToContain: '__v must be a number',
      targetClass: i18nEditDTO,
      testType: -1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 'testing',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: i18nEditDTO,
      testType: 1,
      data: {
        language_code: 'ID',
        iso_2_digits: 'ID',
        iso_3_digits: 'IDN',
        name: 'Indonesia',
        datetime: {
          short: {
            weekday: 'long' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
          long: {
            weekday: 'short' as const,
            era: 'short' as const,
            year: 'numeric' as const,
            month: 'short' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            timezone_name: 'long' as const,
          },
        },
        number: {
          currency: {
            style: '',
            currency: '',
            notation: '',
          },
          decimal: {
            style: '',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          },
          percent: {
            style: '',
            useGrouping: false,
          },
        },
        components: [],
        remark: '-',
        __v: 0,
      },
    },
  ],
}
describe('i18n DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Internationalization add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Internationalization edit'), () => {
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
