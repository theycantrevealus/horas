import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, Validate, ValidateNested } from 'class-validator'

class SEPPengajuanForm {
  @ApiProperty({
    description: 'Nomor Kartu BPJS',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noKartu: string

  @ApiProperty({
    description: 'Tanggal penerbitan SEP. format: yyyy-mm-dd',
    type: String,
    example: '',
  })
  @Validate((target) => {
    const TM = new TimeManagement()
    return TM.validateFormat('YYYY-MM-DD', target.value)
  })
  @IsNotEmpty()
  @IsString()
  tglSep: string

  @ApiProperty({
    type: String,
    description: 'Jenis Pelayanan. 1 = Rawat Inap. 2 = Rawat Jalan',
    enum: ['1', '2'],
    example: '2',
  })
  @IsNotEmpty()
  @IsString()
  jnsPelayanan: string

  @ApiProperty({
    type: String,
    description: '1. Pengajuan backdate, 2. Pengajuan finger print)',
    enum: ['1', '2'],
    example: '1',
  })
  @IsNotEmpty()
  @IsString()
  jnsPengajuan: string

  @ApiProperty({
    type: String,
    description: 'Keterangan',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  keterangan: string
}

export class SEPTPengajuan {
  @ApiProperty({
    type: SEPPengajuanForm,
  })
  @Type(() => SEPPengajuanForm)
  @IsNotEmpty()
  t_sep: SEPPengajuanForm
}
export class SEPPengajuan {
  @ApiProperty({
    type: SEPTPengajuan,
  })
  @Type(() => SEPTPengajuan)
  @ValidateNested()
  @IsNotEmpty()
  request: SEPTPengajuan
}
