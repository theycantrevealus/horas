import { LOVAddDTO, LOVEditDTO } from '@gateway_core/lov/dto/lov'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

describe('LOV DTO', () => {
  const falseCasePayload = {
    add: [
      {
        expectedToContain: 'group should not be empty',
        targetClass: LOVAddDTO,
        testType: -1,
        data: {
          name: 'Sample LOV',
          parent: '',
          remark: '-',
        },
      },
      {
        expectedToContain: 'name should not be empty',
        targetClass: LOVAddDTO,
        testType: -1,
        data: {
          group: 'LOVGROUP',
          parent: '',
          remark: '-',
        },
      },
      {
        expectedToContain: 'Correct data',
        targetClass: LOVAddDTO,
        testType: 1,
        data: {
          group: 'LOVGROUP',
          name: 'Sample LOV',
          parent: '',
          remark: '-',
        },
      },
    ],
    edit: [
      {
        expectedToContain: 'group should not be empty',
        targetClass: LOVEditDTO,
        testType: -1,
        data: {
          name: 'Sample LOV',
          parent: '',
          remark: '-',
          __v: 0,
        },
      },
      {
        expectedToContain: 'name should not be empty',
        targetClass: LOVEditDTO,
        testType: -1,
        data: {
          group: 'LOVGROUP',
          parent: '',
          remark: '-',
          __v: 0,
        },
      },
      {
        expectedToContain: '__v should not be empty',
        targetClass: LOVEditDTO,
        testType: -1,
        data: {
          group: 'LOVGROUP',
          name: 'Sample LOV',
          parent: '',
          remark: '-',
        },
      },
      {
        expectedToContain: '__v must be a number',
        targetClass: LOVEditDTO,
        testType: -1,
        data: {
          group: 'LOVGROUP',
          name: 'Sample LOV',
          parent: '',
          remark: '-',
          __v: 'testing',
        },
      },
      {
        expectedToContain: 'Correct data',
        targetClass: LOVEditDTO,
        testType: 1,
        data: {
          group: 'LOVGROUP',
          name: 'Sample LOV',
          parent: '',
          remark: '-',
          __v: 0,
        },
      },
    ],
  }

  // beforeEach(async () => {})

  describe(testCaption('ADD', 'data', 'LOV add'), () => {
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

  describe(testCaption('EDIT', 'data', 'LOV edit'), () => {
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
