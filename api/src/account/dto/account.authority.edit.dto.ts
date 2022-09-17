import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'

export class AccountAuthorityEditDTO {

    @ApiProperty({
        example: 'Director / Receptionist'
    })
    @IsString()
    name: string
}

export class AccountAuthorityEditDTOResponse {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Authority Updated Successfully' })
    @IsString()
    message: string

    returning: any
}