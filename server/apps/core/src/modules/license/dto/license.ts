import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, MaxLength, Min, MinLength } from 'class-validator'

export class LicenseAddDTO {
  @ApiProperty({
    example: 'ID',
    type: String,
    minLength: 2,
    maxLength: 2,
    description: '',
  })
  @MinLength(2)
  @MaxLength(2)
  @IsNotEmpty()
  country_code: string

  @ApiProperty({
    example: 'North Sumatera',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  state: string

  @ApiProperty({
    example: 'Medan',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  city: string

  @ApiProperty({
    example: 'HORAS',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  organization: string

  @ApiProperty({
    example: 'MIS-IT',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  unit: string

  @ApiProperty({
    example: 'Hendry Tanaka',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  pic: string

  @ApiProperty({
    example: 'theycantrevealus@gmail.com',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  email: string

  @ApiProperty({
    example: 'hellothere15642310!!!',
    type: String,
    description: '',
  })
  @IsNotEmpty()
  password: string

  @ApiProperty({
    example: 365,
    minimum: 1,
    type: Number,
    description: '',
  })
  @Min(1)
  @IsNotEmpty()
  age: number
}
