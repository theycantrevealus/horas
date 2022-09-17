import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNumber } from "class-validator"

export class GrantPermissionDTO {
    @ApiProperty({
        example: 'From Account UID',
    })
    account: any

    @ApiProperty({
        example: 'From Permission ID',
    })
    permission: any

    granted_by: any
}

export class GrantPermissionResponseDTO {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Granted Successfully' })
    @IsString()
    message: string

    returning: any
}