import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator'

class SPRIAddForm {
  @ApiProperty({
    description: 'Nomor SEP',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSEP: string

  @ApiProperty({
    description: 'Kode dokter',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kodeDokter: string

  @ApiProperty({
    description: 'Kode poli',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  poliKontrol: string

  @ApiProperty({
    description:
      'Rawat jalan: diisi dengan tanggal rencana kontrol. Rawat inap: diisi dengan tanggal SPRI. (format: yyyy-mm-dd)',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  tglRencanaKontrol: string

  @IsNotEmpty()
  @IsString()
  user: string
}
export class SPRIAdd {
  @Type(() => SPRIAddForm)
  @ValidateNested({
    each: true,
  })
  request: SPRIAddForm
}
