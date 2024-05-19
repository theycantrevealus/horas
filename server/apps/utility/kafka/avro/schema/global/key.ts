import { IsString } from 'class-validator'

export class KafkaGlobalKey {
  @IsString()
  id: string

  @IsString()
  code: string

  @IsString()
  service: string

  @IsString()
  method: string
}
