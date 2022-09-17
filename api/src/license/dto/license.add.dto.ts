import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class LicenseAddDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'takashitanaka@pondokcoder.com',
  })
  @IsString()
  email: string

  @ApiProperty({
    example: 'John'
  })
  @IsString()
  first_name: string

  @ApiProperty({
    example: 'Doe'
  })
  @IsString()
  last_name: string

  @ApiProperty({
    example: 'ID',
    minLength: 2,
    maxLength: 2
  })
  @IsString()
  country: string

  @ApiProperty({
    example: 'Sumatera Utara'
  })
  @IsString()
  province: string

  @ApiProperty({
    example: 'Medan'
  })
  @IsString()
  city: string

  @ApiProperty({
    example: 'From Company UID'
  })
  @IsString()
  company: any

  @ApiProperty({
    example: 'From Company Unit UID'
  })
  @IsString()
  company_unit: any

  @ApiProperty({
    example: 'YYYY/mm/dd'
  })
  @IsString()
  valid_from: string

  @ApiProperty({
    example: 'YYYY/mm/dd'
  })
  @IsString()
  valid_until: string

  @ApiProperty({
    example: '123',
  })
  @IsString()
  private_key_password: string
}

export class LicenseAddDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number

  @ApiProperty({ example: 'License Created Successfully' })
  @IsString()
  message: string

  returning: any
}
