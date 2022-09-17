import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNumber } from "class-validator"

export class MenuPermissionAddDTO {
    @ApiProperty({
        uniqueItems: true,
        example: 'Menu Permission DOM Identifier',
    })
    @IsString()
    domiden: string

    @ApiProperty({
        example: 'Dispatching Target',
    })
    @IsString()
    dispatchname: string

    @ApiProperty({
        example: 'Service Group Name',
    })
    @IsString()
    servicegroup: string

    @ApiProperty({
        example: 'Menu Container',
    })
    @IsString()
    menu: any
}

export class MenuPermissionAddResponseDTO {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Menu Permission Created Successfully' })
    @IsString()
    message: string

    returning: any
}