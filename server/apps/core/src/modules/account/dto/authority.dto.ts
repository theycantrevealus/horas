import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class AuthorityAddDTO {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: String,
    description: '',
    required: false,
  })
  @IsOptional()
  remark?: string
}

export class AuthorityEditDTO {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    type: String,
    description: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  remark?: string

  @ApiProperty({
    example: 0,
    description: 'Document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number
}
