import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber } from "class-validator";

export class MenuAddDTO {
    @ApiProperty({
        uniqueItems: true,
        example: 'Menu Dashboard',
    })
    @IsString()
    name: string
}

export class MenuAddResponseDTO {
    @ApiProperty({ example: 201 })
    @IsNumber()
    status: number;

    @ApiProperty({ example: 'Menu Created Successfully' })
    @IsString()
    message: string;
}