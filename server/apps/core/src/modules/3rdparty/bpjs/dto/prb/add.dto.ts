import {ApiProperty} from "@nestjs/swagger";
import {IsArray, IsEmail, IsNotEmpty, IsString, ValidateNested} from "class-validator";
import {IObat, PrbContract} from "@core/3rdparty/bpjs/contract/prb.contract";
import {Type} from "class-transformer";

class PRBAddForm implements PrbContract {
  @ApiProperty({
    description: 'Nomor SEP',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noSep: string

  @ApiProperty({
    description: 'Nomor Kartu BPJS',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  noKartu: string

  @ApiProperty({
    description: 'Alamat',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  alamat: string

  @ApiProperty({
    description: 'Email',
    type: String,
    example: 'email@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    description: 'Kode Program PRB',
    type: String,
    example: '09',
  })
  @IsNotEmpty()
  @IsString()
  programPRB: string

  @ApiProperty({
    description: 'Kode DPJP',
    type: String,
    example: '',
  })
  @IsNotEmpty()
  @IsString()
  kodeDPJP: string

  @ApiProperty({
    description: 'Keterangan',
    type: String,
    example: 'Kelelahan kerja',
  })
  @IsNotEmpty()
  @IsString()
  keterangan: string

  @ApiProperty({
    description: 'Saran',
    type: String,
    example: 'Pasien harus olahraga bersama setiap minggu dan cuti, edukasi agar jangan disuruh kerja terus, lama lama stress',
  })
  @IsNotEmpty()
  @IsString()
  saran: string

  @ApiProperty({
    description: 'Obat',
    type: Array,
    example: [
      {
        "kdObat":"00196120124",
        "signa1":"1",
        "signa2":"1",
        "jmlObat":"11"
      },
      {
        "kdObat":"00011220018",
        "signa1":"1",
        "signa2":"1",
        "jmlObat":"10"
      }
    ],
  })
  @IsNotEmpty()
  @IsArray()
  obat: IObat[]
}

export class PRBTAdd {
  @ApiProperty({
    type: PRBAddForm,
  })
  @Type(() => PRBAddForm)
  @IsNotEmpty()
  t_prb: PRBTAdd
}

export class PRBAdd {
  @ApiProperty({
    type: PRBTAdd,
  })
  @Type(() => PRBTAdd)
  @ValidateNested()
  @IsNotEmpty()
  request: PRBTAdd
}
