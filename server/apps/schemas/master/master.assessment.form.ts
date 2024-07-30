import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { HydratedDocument, SchemaTypes } from 'mongoose'

const AssessmentFieldGroupTemplate = raw({
  /**
   * UI grouper id for each element. It will displayed as tab
   *
   *    Example:
   *    ------------------------------------------------------------------------------------------------------------
   *    | General Assessment | Doctor | Nurse | Odontogram | Specific department's assessment | Another tab group assessment |
   *    ------------------------------------------------------------------------------------------------------------
   * */
  ui_group: { type: String },

  /**
   * UI grouper caption
   * */
  ui_group_caption: { type: String },

  /**
   * UI column number display. Example: if set 2 than form displayed into 2 columns
   * */
  ui_group_column: { type: Number },
})

const AssessmentFieldTemplate = raw({
  /**
   * UI group
   * */
  group: AssessmentFieldGroupTemplate,

  /**
   * UI type to render, example : Input Text, Radio, Combo
   * It will inform front end while rendering dynamic UI form on assessment page
   * */
  ui_type: { type: String },

  /**
   * UI caption to display, example: Planning, Objective
   * */
  ui_caption: { type: String },

  /**
   * UI idenfitifer
   * */
  ui_identifier: { type: String },

  /**
   * Acceptable data type, example: String, Numeric
   * */
  input_type: { type: String },

  /**
   * Mandatorial configuration on input
   * */
  input_mandatory: { type: Boolean },

  /**
   * Rendered placeholder
   * */
  input_placeholder: { type: String },

  /**
   * UI class grouper. If not set, it will render default class as configured as default template
   * */
  input_class: { type: String },

  /**
   * Rendered placeholder
   * */
  input_config: { type: SchemaTypes.Mixed },
})

export interface IAssessmentFieldGroupTemplate {
  ui_group: string
  ui_group_caption: string
  ui_group_column: number
}

export interface IAssessmentFieldTemplate {
  group: IAssessmentFieldGroupTemplate
  ui_type: string
  ui_caption: string
  ui_identifier: string
  input_type: string
  input_mandatory: string
  input_placeholder: string
  input_class: string
  input_config: string
}

export type MasterAssessmentFormDocument =
  HydratedDocument<MasterAssessmentForm>

@Schema({ collection: 'master_assessment_form' })
export class MasterAssessmentForm {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true, required: true })
  document_version: string

  @Prop({ type: [AssessmentFieldTemplate], _id: false })
  elements: IAssessmentFieldTemplate[]

  @Prop({ type: SchemaTypes.String, required: true })
  remark: string

  @Prop({
    required: true,
    enum: ['new', 'need_approval', 'approved', 'declined'],
    type: SchemaTypes.String,
    default: 'new',
  })
  status: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const MasterAssessmentFormSchema =
  SchemaFactory.createForClass(MasterAssessmentForm)
