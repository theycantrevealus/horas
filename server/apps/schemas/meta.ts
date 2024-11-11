import { raw } from '@nestjs/mongoose'

export const MetaData = raw({
  branch: { type: String, example: 'branchName', default: '' },
  commit: { type: String, example: 'xxxxx', default: '' },
})

export interface IMetaData {
  branch: string
  commit: string
}
