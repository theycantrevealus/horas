import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MenuPermissionDeleteResponseDTO {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Permission Deleted Successfully' })
    @IsString()
    message: string

    returning: any
}