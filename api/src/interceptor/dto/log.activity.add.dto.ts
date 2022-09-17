import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber } from 'class-validator'
import { AccountModel } from '../../model/account.model'

export class LogActivityAddDTO {
    @ApiProperty({
        example: 'account uid'
    })
    account: any

    @ApiProperty({
        example: 'model target from mod lib'
    })
    @IsString()
    table_target: string

    @ApiProperty({
        example: 'ID/UID'
    })
    @IsString()
    table_identifier: string

    @ApiProperty({
        example: 'Log Meta Value'
    })
    @IsString()
    log_meta: string

    @ApiProperty({
        minLength: 1,
        example: 'I = Insert, U = Update, D = Delete',
    })
    @IsString()
    action: string

    @ApiProperty({
        example: 'Value before editted',
    })
    @IsString()
    old_meta: string

    @ApiProperty({
        example: 'Value after editted',
    })
    @IsString()
    new_meta: string
}

export class LogActivityAddDTOResponse {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number

    @ApiProperty({ example: 'Activity Logged Successfully' })
    @IsString()
    message: string
}
