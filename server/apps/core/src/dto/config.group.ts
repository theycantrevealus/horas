import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber } from 'class-validator'

import { CConfigGroup } from '../schemas/config.group'

export class ConfigGroupAddDTO {
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
    example: '0',
    description: 'Level for primevue tree',
  })
  @IsNotEmpty()
  level: string

  @ApiProperty({
    example: '0',
    description: 'Level for primevue tree',
  })
  @IsNotEmpty()
  icon: string

  @ApiProperty({
    type: CConfigGroup,
    description: 'Parent tree',
  })
  @IsNotEmpty()
  parent: CConfigGroup

  @ApiProperty({
    example: '',
    description: 'Configuration remark',
  })
  @IsNotEmpty()
  remark: string

  constructor(parameter: any) {
    this.name = parameter.name
    this.label = parameter.label
    this.level = parameter.level
    this.icon = parameter.icon
    this.parent = parameter.parent
    this.remark = parameter.remark
  }
}

export class ConfigGroupEditDTO {
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
    example: '0',
    description: 'Level for primevue tree',
  })
  @IsNotEmpty()
  level: string

  @ApiProperty({
    example: '0',
    description: 'Level for primevue tree',
  })
  @IsNotEmpty()
  icon: string

  @ApiProperty({
    type: CConfigGroup,
    description: 'Parent tree',
  })
  @IsNotEmpty()
  parent: CConfigGroup

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

  constructor(parameter: any) {
    this.name = parameter.name
    this.label = parameter.label
    this.level = parameter.level
    this.icon = parameter.icon
    this.parent = parameter.parent
    this.remark = parameter.remark
    this.__v = parameter.__v
  }
}
