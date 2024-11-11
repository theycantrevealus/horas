import {
  MasterAssessmentFormAddDTO,
  MasterAssessmentFormEditDTO,
} from '@gateway_core/master/dto/master.assessment.form'
import { testCaption } from '@utility/string'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

const falseCasePayload = {
  add: [
    {
      expectedToContain: 'document_version should not be empty',
      targetClass: MasterAssessmentFormAddDTO,
      testType: -1,
      data: {
        elements: [
          {
            group: {
              ui_group: '',
              ui_group_caption: '',
              ui_group_column: '',
            },
            ui_type: '',
            ui_caption: '',
            ui_identifier: '',
            input_type: '',
            input_mandatory: '',
            input_placeholder: '',
            input_class: '',
            input_config: '',
          },
        ],
        remark: '',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterAssessmentFormAddDTO,
      testType: 1,
      data: {
        document_version: 'v1',
        elements: [
          {
            group: {
              ui_group: '',
              ui_group_caption: '',
              ui_group_column: '',
            },
            ui_type: '',
            ui_caption: '',
            ui_identifier: '',
            input_type: '',
            input_mandatory: '',
            input_placeholder: '',
            input_class: '',
            input_config: '',
          },
        ],
        remark: '',
      },
    },
  ],
  edit: [
    {
      expectedToContain: 'document_version should not be empty',
      targetClass: MasterAssessmentFormEditDTO,
      testType: -1,
      data: {
        elements: [
          {
            group: {
              ui_group: '',
              ui_group_caption: '',
              ui_group_column: '',
            },
            ui_type: '',
            ui_caption: '',
            ui_identifier: '',
            input_type: '',
            input_mandatory: '',
            input_placeholder: '',
            input_class: '',
            input_config: '',
          },
        ],
        remark: '',
        __v: 0,
      },
    },
    {
      expectedToContain: '__v should not be empty',
      targetClass: MasterAssessmentFormEditDTO,
      testType: -1,
      data: {
        document_version: 'v1',
        elements: [
          {
            group: {
              ui_group: '',
              ui_group_caption: '',
              ui_group_column: '',
            },
            ui_type: '',
            ui_caption: '',
            ui_identifier: '',
            input_type: '',
            input_mandatory: '',
            input_placeholder: '',
            input_class: '',
            input_config: '',
          },
        ],
        remark: '',
      },
    },
    {
      expectedToContain: 'Correct data',
      targetClass: MasterAssessmentFormEditDTO,
      testType: 1,
      data: {
        document_version: 'v1',
        elements: [
          {
            group: {
              ui_group: '',
              ui_group_caption: '',
              ui_group_column: '',
            },
            ui_type: '',
            ui_caption: '',
            ui_identifier: '',
            input_type: '',
            input_mandatory: '',
            input_placeholder: '',
            input_class: '',
            input_config: '',
          },
        ],
        remark: '',
        __v: 0,
      },
    },
  ],
}
describe('Master Assessment Form DTO Test', () => {
  describe(testCaption('ADD', 'data', 'Master assessment form add'), () => {
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

  describe(testCaption('EDIT', 'data', 'Master assessment form edit'), () => {
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
