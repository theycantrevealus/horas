import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator'

class SEPPemulanganForm {
  @ApiProperty({
    type: String,
    description: 'Nomor SEP',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSep: string

  @ApiProperty({
    type: String,
    description:
      '1:Atas Persetujuan Dokter, 3:Atas Permintaan Sendiri, 4:Meninggal, 5:Lain-lain',
    enum: ['1', '2', '3', '4', '5'],
    example: '1',
  })
  @IsNotEmpty()
  @IsString()
  statusPulang: string

  @ApiProperty({
    type: String,
    description: 'Diisi jika statusPulang 4, selain itu kosong',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSuratMeninggal: string

  @ApiProperty({
    type: String,
    description:
      'Diisi jika statusPulang 4, selain itu kosong. format yyyy-MM-dd',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  tglMeninggal: string

  @ApiProperty({
    type: String,
    description: 'Tanggal Pulang formt yyyy-MM-dd',
    example: new TimeManagement()
      .getRaw('Asia/Jakarta', 'YYYY-MM-DD')
      .toString(),
  })
  @IsNotEmpty()
  @IsString()
  tglPulang: string

  @ApiProperty({
    type: String,
    description: 'Diisi jika SEPnya adalah KLL',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noLPManual: string
}

export class SEPTPulang {
  @ApiProperty({
    type: SEPPemulanganForm,
  })
  @Type(() => SEPPemulanganForm)
  @IsNotEmpty()
  t_sep: SEPPemulanganForm
}
export class SEPPulang {
  @ApiProperty({
    type: SEPTPulang,
  })
  @Type(() => SEPTPulang)
  @ValidateNested()
  @IsNotEmpty()
  request: SEPTPulang
}
