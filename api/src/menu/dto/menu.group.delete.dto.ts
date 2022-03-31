import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class MenuGroupDeleteDTOResponse {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Group Deleted Successfully' })
    @IsString()
    message: string

    returning: any
}