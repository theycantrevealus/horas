import {
  COB,
  Katarak,
  KelasRawat,
  LakaLantas,
  Poli,
} from '@gateway_core/3rdparty/bpjs/dto/sep/sub'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator'

class SEPEditForm {
  @ApiProperty({
    type: KelasRawat,
  })
  @Type(() => KelasRawat)
  @ValidateNested()
  @IsNotEmpty()
  klsRawat: KelasRawat

  @ApiProperty({
    type: String,
    description: 'Nomor MR rumah sakit',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noMR: string

  @ApiProperty({
    type: String,
    description: 'Catatan peserta',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  catatan: string

  @ApiProperty({
    type: String,
    description: 'Diagnosa awal ICD10. [Ref. Diagnosa]',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  diagAwal: string

  @ApiProperty({
    type: Poli,
  })
  @ValidateNested()
  @IsNotEmpty()
  poli: Poli

  @ApiProperty({
    type: COB,
  })
  @ValidateNested()
  @IsNotEmpty()
  cob: COB

  @ApiProperty({
    type: Katarak,
  })
  @ValidateNested()
  @IsNotEmpty()
  katarak: Katarak

  @ApiProperty({
    type: LakaLantas,
  })
  @ValidateNested()
  @IsNotEmpty()
  jaminan: LakaLantas

  @ApiProperty({
    description:
      'Kode DPJP Pelayanan. Tidak diisi jika jnsPelayanan adalah rawat inap. [Ref. DPJP]',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  dpjpLayan: string

  @ApiProperty({
    description: 'Nomor telepon',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noTelp: string
}

export class SEPTEdit {
  @ApiProperty({
    type: SEPEditForm,
  })
  @Type(() => SEPEditForm)
  @IsNotEmpty()
  t_sep: SEPEditForm
}
export class SEPEdit {
  @ApiProperty({
    type: SEPTEdit,
  })
  @Type(() => SEPTEdit)
  @ValidateNested()
  @IsNotEmpty()
  request: SEPTEdit
}
