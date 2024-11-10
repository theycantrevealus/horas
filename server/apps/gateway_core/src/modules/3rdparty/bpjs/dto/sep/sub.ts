import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { IsNotEmpty, IsString, Validate, ValidateNested } from 'class-validator'

export class Rujukan {
  @ApiProperty({
    description: 'Asal rujukan. 1 = Faskes I. 2 = Faskes II / RS',
    enum: ['1', '2'],
    example: '2',
  })
  @IsNotEmpty()
  @IsString()
  asalRujukan: string

  @ApiProperty({
    description: 'Tanggal rujukan. format: yyyy-mm-dd',
    example: new TimeManagement().getRaw('Asia/Jakarta', 'YYYY-MM-DD'),
    type: String,
  })
  @Validate((target) => {
    const TM = new TimeManagement()
    return TM.validateFormat('YYYY-MM-DD', target.value)
  })
  @IsNotEmpty()
  @IsString()
  tglRujukan: string

  @ApiProperty({
    description: 'No rujukan',
    example: '',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  noRujukan: string

  @ApiProperty({
    description: 'Kode faskes rujukan',
    example: '0069R035',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  ppkRujukan: string
}
export class KelasRawat {
  @ApiProperty({
    description:
      'Diisi jika ingin naik kelas rawat. 1. VVIP, 2. VIP, 3. Kelas 1, 4. Kelas 2, 5. Kelas 3, 6. ICCU, 7. ICU, 8. Diatas Kelas 1',
    example: '',
    enum: ['', '1', '2', '3', '4', '5', '6', '7', '8'],
  })
  @IsNotEmpty()
  @IsString()
  klsRawatNaik: string

  @ApiProperty({
    description:
      '1 = Pribadi, 2 Pemberi Kerja, 3 = Asuransi kesehatan tambahan. Diisi jika naik kelas rawat',
    enum: ['', '1', '2', '3'],
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  pembiayaan: string

  @ApiProperty({
    description:
      'Sesuai dengan nama deskripsi di pembiayaan. Cth: Jika pembiayaan 1, maka penanggung jawab = Pribadi',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  penanggungJawab: string
}

export class Poli {
  @ApiProperty({
    type: String,
    description: 'Kode poli tujuan. [Ref. Poli]',
    example: 'IGD',
  })
  @IsNotEmpty()
  @IsString()
  tujuan: string

  @ApiProperty({
    type: String,
    enum: ['0', '1'],
    description: 'Poli eksekutif. 0 = tidak, 1 = ya',
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  eksekutif: string
}

export class COB {
  @ApiProperty({
    type: String,
    enum: ['0', '1'],
    description: 'COB. 0 = tidak, 1 = ya',
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  cob: string
}

export class Katarak {
  @ApiProperty({
    type: String,
    enum: ['0', '1'],
    description: 'Katarak. 0 = tidak, 1 = ya',
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  katarak: string
}

export class LokasiLaka {
  @ApiProperty({
    type: String,
    description: 'Kode propinsi. [Ref. Propinsi]',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kdPropinsi: string

  @ApiProperty({
    type: String,
    description: 'Kode kabupaten. [Ref. Kabupaten]',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kdKabupaten: string

  @ApiProperty({
    type: String,
    description: 'Kode kecamatan. [Ref. Kecamatan]',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kdKecamatan: string
}

export class Suplesi {
  @ApiProperty({
    type: String,
    enum: ['0', '1'],
    description: 'Suplesi. 0 = tidak, 1 = ya',
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  suplesi: string

  @ApiProperty({
    type: String,
    description: 'No.SEP yang Jika Terdapat Suplesi',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSepSuplesi: string

  @ApiProperty({
    type: LokasiLaka,
  })
  @ValidateNested()
  @IsNotEmpty()
  lokasiLaka: LokasiLaka
}

export class PenjaminLakaLantas {
  @ApiProperty({
    type: String,
    description: 'tanggal kejadian KLL format: yyyy-mm-dd',
    example: '',
  })
  @Validate((target) => {
    const TM = new TimeManagement()
    return TM.validateFormat('YYYY-MM-DD', target.value)
  })
  @IsNotEmpty()
  @IsString()
  tglKejadian: string

  @ApiProperty({
    type: String,
    description: 'Keterangan kejadian KLL',
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  keterangan: string

  @ApiProperty({
    type: Suplesi,
  })
  @ValidateNested()
  @IsNotEmpty()
  suplesi: Suplesi
}

export class LakaLantas {
  @ApiProperty({
    type: String,
    enum: ['', '0', '1', '2', '3'],
    description:
      '0 : Bukan Kecelakaan lalu lintas [BKLL], 1 : KLL dan bukan kecelakaan Kerja [BKK], 2 : KLL dan KK, 3 : KK',
    example: '0',
  })
  @IsNotEmpty()
  @IsString()
  lakaLantas: string

  @ApiProperty({
    type: String,
    description: 'No LP',
    example: '12345',
  })
  @IsNotEmpty()
  @IsString()
  noLP: string

  @ApiProperty({
    type: PenjaminLakaLantas,
    description: 'No LP',
  })
  @ValidateNested()
  @IsNotEmpty()
  penjamin: PenjaminLakaLantas
}

export class SKDP {
  @ApiProperty({
    description: 'Nomor Surat Kontrol',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSurat: string

  @ApiProperty({
    description: 'Kode dokter DPJP. [Ref. DPJP]',
    type: String,
    example: '436619',
  })
  @IsNotEmpty()
  @IsString()
  kodeDPJP: string
}
