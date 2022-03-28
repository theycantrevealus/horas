import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNumber } from "class-validator"

export class GrantAccessDTO {
    @ApiProperty({
        example: 'From Account UID',
    })
    account: any

    @ApiProperty({
        example: 'From Menu UID',
    })
    menu: any
}

export class GrantAccessResponseDTO {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Granted Successfully' })
    @IsString()
    message: string

    returning: any
}