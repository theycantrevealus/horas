import { ApiProperty } from '@nestjs/swagger'
import { IConfig } from '@schemas/config/config'
import { CConfigGroup } from '@schemas/config/config.group'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class ConfigAddDTO {
  @ApiProperty({
    example: '',
    description: 'Configiguration identifier',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '',
    required: false,
    description: 'For displaying on configuration manager',
  })
  @IsNotEmpty()
  label: string

  @ApiProperty({
    required: false,
    description: 'Configiguration grouper',
  })
  @IsNotEmpty()
  group: CConfigGroup

  @ApiProperty({
    example: ``,
    description: 'Setter for configuration',
  })
  @IsNotEmpty()
  setter: any

  @ApiProperty({
    example: '',
    description: 'Configuration remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: IConfig) {
    this.name = parameter.name
    this.setter = parameter.setter
    this.remark = parameter.remark
  }
}

export class ConfigEditDTO {
  @ApiProperty({
    example: '',
    description: 'Configiguration identifier',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: '',
    required: false,
    description: 'For displaying on configuration manager',
  })
  @IsNotEmpty()
  label: string

  @ApiProperty({
    required: false,
    description: 'Configiguration grouper',
  })
  @IsNotEmpty()
  group: CConfigGroup

  @ApiProperty({
    example: ``,
    description: 'Setter for configuration',
  })
  @IsNotEmpty()
  setter: any

  @ApiProperty({
    example: '',
    description: 'Configuration remark',
  })
  @IsNotEmpty()
  remark: string

  @ApiProperty({
    example: 0,
    description: 'Item brand document version',
  })
  @IsNotEmpty()
  @IsNumber()
  __v: number

  constructor(parameter: IConfig) {
    this.name = parameter.name
    this.setter = parameter.setter
    this.remark = parameter.remark
    this.__v = parameter.__v
  }
}
