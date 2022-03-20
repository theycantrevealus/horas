import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class AccountAuthorityDeleteDTOResponse {
    @ApiProperty({ example: 200 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Authority Created Successfully' })
    @IsString()
    message: string;
}