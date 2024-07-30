import { ApiProperty } from '@nestjs/swagger'
import {
  IAssessmentFieldGroupTemplate,
  IAssessmentFieldTemplate,
} from '@schemas/master/master.assessment.form'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CMasterAssessmentFormElementGroup {
  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  ui_group: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  ui_group_caption: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  ui_group_column: string
}

export class CMasterAssessmentFormElement {
  @ApiProperty({
    type: CMasterAssessmentFormElementGroup,
    required: false,
    description: 'Assessment element group',
  })
  @Type(() => CMasterAssessmentFormElementGroup)
  group: IAssessmentFieldGroupTemplate

  @ApiProperty({
    example: 'text',
    description: 'UI type to render, example : Input Text, Radio, Combo',
  })
  @IsNotEmpty()
  ui_type: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  ui_caption: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  ui_identifier: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  input_type: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  input_mandatory: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  input_placeholder: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  input_class: string

  @ApiProperty({
    example: 'text',
    description: '',
  })
  @IsNotEmpty()
  input_config: string
}

export class MasterAssessmentFormAddDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Document version',
  })
  @IsString()
  @IsNotEmpty()
  document_version: string

  @ApiProperty({
    type: CMasterAssessmentFormElement,
    isArray: true,
    required: false,
    default: [],
    description: 'Assessment element',
  })
  @Type(() => CMasterAssessmentFormElement)
  elements: IAssessmentFieldTemplate[]

  @ApiProperty({
    example: '',
    description: 'Extra remark',
  })
  @IsString()
  remark: string
}

export class MasterAssessmentFormEditDTO {
  @ApiProperty({
    example: 'xxx-xxxx',
    description: 'Document version',
  })
  @IsNotEmpty()
  document_version: string

  @ApiProperty({
    type: CMasterAssessmentFormElement,
    isArray: true,
    required: false,
    default: [],
    description: 'Assessment element',
  })
  @Type(() => CMasterAssessmentFormElement)
  elements: IAssessmentFieldTemplate[]

  @ApiProperty({
    example: '',
    description: 'Extra remark',
  })
  @IsString()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Assessment form document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
