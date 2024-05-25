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
}
