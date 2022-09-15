import { IsString } from 'class-validator'

export class LogLoginDTO {
  @IsString()
  account: any

  @IsString()
  log_meta: string

  @IsString()
  token: string
}
