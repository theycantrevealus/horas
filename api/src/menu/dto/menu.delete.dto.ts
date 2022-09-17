import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MenuDeleteDTOResponse {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Deleted Successfully' })
    @IsString()
    message: string

    returning: any
}