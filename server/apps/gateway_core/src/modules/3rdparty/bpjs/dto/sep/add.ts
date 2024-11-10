import {
  COB,
  Katarak,
  KelasRawat,
  LakaLantas,
  Poli,
  Rujukan,
  SKDP,
} from '@gateway_core/3rdparty/bpjs/dto/sep/sub'
import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, Validate, ValidateNested } from 'class-validator'

class SEPAddForm {
  @ApiProperty({
    description: 'Nomor Kartu BPJS',
    type: String,
    example: '0002083184032',
  })
  @IsNotEmpty()
  @IsString()
  noKartu: string

  @ApiProperty({
    description: 'Tanggal penerbitan SEP. format: yyyy-mm-dd',
    type: String,
    example: new TimeManagement()
      .getRaw('Asia/Jakarta', 'YYYY-MM-DD')
      .toString(),
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
    type: KelasRawat,
  })
  @Type(() => KelasRawat)
  @ValidateNested()
  @IsNotEmpty()
  klsRawat: KelasRawat

  @ApiProperty({
    type: String,
    description: 'Nomor MR rumah sakit',
    example: '000005',
  })
  @IsNotEmpty()
  @IsString()
  noMR: string

  @ApiProperty({
    type: Rujukan,
  })
  @ValidateNested()
  @IsNotEmpty()
  rujukan: Rujukan

  @ApiProperty({
    type: String,
    description: 'Catatan peserta',
    example: 'Uji coba catatan peserta',
  })
  @IsNotEmpty()
  @IsString()
  catatan: string

  @ApiProperty({
    type: String,
    description: 'Diagnosa awal ICD10. [Ref. Diagnosa]',
    example: 'E10',
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
    type: String,
    description: '0 = Normal, 1 = Prosedur, 2 = Konsul Dokter',
    enum: ['0', '1', '2'],
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  tujuanKunj: string

  @ApiProperty({
    type: String,
    description: `
      0 = Prosedur Tidak Berkelanjutan;
      1 = Prosedur dan Terapi Berkelanjutan;
      Kosongkan jika tujuanKunj = 0`,
    enum: ['', '0', '1', '2'],
    default: '',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  flagProcedure: string

  @ApiProperty({
    type: String,
    description: `
    1 = Radioterapi;
    2 = Kemoterapi;
    3 = Rehabilitasi Medik;
    4 = Rehabilitasi Psikososial;
    5 = Transfusi Darah;
    6 = Pelayanan Gigi;
    7 = Laboratorium;
    8 = USG;
    9 = Farmasi;
    10 = Lain-Lain;
    11 = MRI;
    12 = HEMODIALISA;
    Kosongkan jika tujuanKunj = 0`,
    enum: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    default: '',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kdPenunjang: string

  @ApiProperty({
    type: String,
    description: `
    1 = Poli spesialis tidak tersedia pada hari sebelumnya;
    2 = Jam Poli telah berakhir pada hari sebelumnya;
    3 = Dokter Spesialis yang dimaksud tidak praktek pada hari sebelumnya;
    4 = Atas Instruksi RS; Diisi jika tujuanKunj = "2" atau "0" (politujuan beda dengan poli rujukan dan hari beda) Kosongkan jika tujuanKunj = 0
    5 = Tujuan Kontrol`,
    enum: ['', '1', '2', '3', '4', '5'],
    default: '',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  assesmentPel: string

  @ApiProperty({
    type: SKDP,
  })
  @ValidateNested()
  @IsNotEmpty()
  skdp: SKDP

  @ApiProperty({
    description:
      'Kode DPJP Pelayanan. Tidak diisi jika jnsPelayanan adalah rawat inap. [Ref. DPJP]',
    type: String,
    example: '436619',
  })
  @IsNotEmpty()
  @IsString()
  dpjpLayan: string

  @ApiProperty({
    description: 'Nomor telepon',
    type: String,
    example: '085261510202',
  })
  @IsNotEmpty()
  @IsString()
  noTelp: string
}

export class SEPTAdd {
  @ApiProperty({
    type: SEPAddForm,
  })
  @Type(() => SEPAddForm)
  @IsNotEmpty()
  t_sep: SEPAddForm
}
export class SEPAdd {
  @ApiProperty({
    type: SEPTAdd,
  })
  @Type(() => SEPTAdd)
  @ValidateNested()
  @IsNotEmpty()
  request: SEPTAdd
}
