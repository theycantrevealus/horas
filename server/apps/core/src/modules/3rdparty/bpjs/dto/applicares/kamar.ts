import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class ApplicaresKamarAdd {
  @ApiProperty({
    type: String,
    example: 'VIP',
    description: '',
  })
  @IsNotEmpty()
  kodekelas: string

  @ApiProperty({
    type: String,
    example: 'RG01',
    description: '',
  })
  @IsNotEmpty()
  koderuang: string

  @ApiProperty({
    type: String,
    example: 'Ruang Anggrek VIP',
    description: '',
  })
  @IsNotEmpty()
  namaruang: string

  @ApiProperty({
    type: String,
    example: '20',
    description: '',
  })
  @IsNotEmpty()
  kapasitas: string

  @ApiProperty({
    type: String,
    example: '10',
    description: '',
  })
  @IsNotEmpty()
  tersedia: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediapria: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediawanita: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediapriawanita: string
}
export class ApplicaresKamarEdit {
  @ApiProperty({
    type: String,
    example: 'VIP',
    description: '',
  })
  @IsNotEmpty()
  kodekelas: string

  @ApiProperty({
    type: String,
    example: 'RG01',
    description: '',
  })
  @IsNotEmpty()
  koderuang: string

  @ApiProperty({
    type: String,
    example: 'Ruang Anggrek VIP',
    description: '',
  })
  @IsNotEmpty()
  namaruang: string

  @ApiProperty({
    type: String,
    example: '20',
    description: '',
  })
  @IsNotEmpty()
  kapasitas: string

  @ApiProperty({
    type: String,
    example: '10',
    description: '',
  })
  @IsNotEmpty()
  tersedia: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediapria: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediawanita: string

  @ApiProperty({
    type: String,
    example: '0',
    description: '',
  })
  @IsNotEmpty()
  tersediapriawanita: string
}
