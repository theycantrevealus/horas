import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class AccountAddDTO {
    @ApiProperty({
        uniqueItems: true,
        example: 'takashitanaka@pondokcoder.com',
    })
    @IsString()
    email: string;

    @ApiProperty({
        example: 'John'
    })
    @IsString()
    first_name: string;

    @ApiProperty({
        example: 'Doe'
    })
    @IsString()
    last_name: string;

    @ApiProperty({
        example: 'From Authority UID'
    })
    @IsString()
    authority: string;

    @ApiProperty({
        minLength: 6,
        example: '123',
    })
    @IsString()
    password: string;
}

export class AccountAddDTOResponseSuccess {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Account Created Successfully' })
    @IsString()
    message: string;
}

export class AccountAddDTOResponseFailed {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Account Failed to Created' })
    @IsString()
    message: string;
}