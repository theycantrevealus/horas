import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class AccountAuthorityAddDTO {
    @ApiProperty({
        example: 'Director / Receptionist'
    })
    @IsString()
    name: string;
}

export class AccountAuthorityAddDTOResponseSuccess {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Authority Created Successfully' })
    @IsString()
    message: string;
}

export class AccountAuthorityAddDTOResponseFailed {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Authority Failed to Created' })
    @IsString()
    message: string;
}