import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { TimeManagement } from '@utility/time'
import {
  IsDate,
  IsNotEmpty,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const Rujukan = raw({
  asalRujukan: { type: String, example: '' },
  tglRujukan: { type: String, example: '' },
  noRujukan: { type: String, example: '' },
  ppkRujukan: { type: String, example: '' },
})

export interface IRujukan {
  asalRujukan: string
  tglRujukan: string
  noRujukan: string
  ppkRujukan: string
}

export const KelasRawat = raw({
  klsRawatNaik: {
    type: String,
    example: '',
    enum: ['', '1', '2', '3', '4', '5', '6', '7', '8'],
  },
  pembiayaan: { type: String, example: '1', enum: ['', '1', '2', '3'] },
  penanggungJawab: { type: String, example: '' },
  ppkRujukan: { type: String, example: '' },
})

export interface IKelasRawat {
  klsRawatNaik: string
  pembiayaan: string
  penanggungJawab: string
  ppkRujukan: string
}

export const Poli = raw({
  tujuan: { type: String, example: '' },
  eksekutif: { type: String, example: '', enum: ['0', '1'] },
})

export interface IPoli {
  tujuan: string
  eksekutif: string
}

export const COB = raw({
  cob: { type: String, example: '', enum: ['0', '1'] },
})

export interface ICOB {
  cob: string
}

export const Katarak = raw({
  katarak: { type: String, example: '', enum: ['0', '1'] },
})

export interface IKatarak {
  cob: string
}

export const LokasiLaka = raw({
  kdPropinsi: { type: String, example: '' },
  kdKabupaten: { type: String, example: '' },
  kdKecamatan: { type: String, example: '' },
})

export const Suplesi = raw({
  suplesi: { type: String, example: '', enum: ['0', '1'] },
  noSepSuplesi: { type: String, example: '' },
  lokasiLaka: { type: LokasiLaka, _id: false },
})

export const PenjaminLakaLantas = raw({
  tglKejadian: { type: String, example: '' },
  keterangan: { type: String, example: '' },
  suplesi: { type: Suplesi, _id: false },
})

export const LakaLantas = raw({
  lakaLantas: { type: String, example: '', enum: ['0', '1', '2', '3'] },
  noLP: { type: String, example: '' },
  penjamin: { type: PenjaminLakaLantas, _id: false },
})

export interface ILakaLantas {
  cob: string
  noLP: string
  penjamin: string
}

export const SKDP = raw({
  noSurat: { type: String, example: '' },
  kodeDPJP: { type: String, example: '' },
})

export interface ISKDP {
  noSurat: string
  kodeDPJP: string
}

export type SEPDocument = HydratedDocument<SEP>

@Schema({ collection: 'bpjs_sep' })
export class SEP {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noKartu: string

  @Prop({ type: SchemaTypes.String, unique: true })
  @IsNotEmpty()
  @IsString()
  noSep: string

  @Prop({ type: SchemaTypes.String })
  @Validate((target) => {
    const TM = new TimeManagement()
    return TM.validateFormat('YYYY-MM-DD', target.value)
  })
  @IsNotEmpty()
  @IsDate()
  tglSep: string

  @Prop({ type: SchemaTypes.String, enum: ['1', '2'] })
  @IsNotEmpty()
  @IsString()
  jnsPelayanan: string

  @Prop(raw(KelasRawat))
  @ValidateNested()
  @IsNotEmpty()
  klsRawat: IKelasRawat

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noMR: string

  @Prop(raw(Rujukan))
  @ValidateNested()
  @IsNotEmpty()
  rujukan: IRujukan

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  catatan: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  diagAwal: string

  @Prop(raw(Poli))
  @ValidateNested()
  @IsNotEmpty()
  poli: IPoli

  @Prop(raw(COB))
  @ValidateNested()
  @IsNotEmpty()
  cob: ICOB

  @Prop(raw(Katarak))
  @ValidateNested()
  @IsNotEmpty()
  katarak: IKatarak

  @Prop(raw(LakaLantas))
  @ValidateNested()
  @IsNotEmpty()
  jaminan: ILakaLantas

  @Prop({ type: SchemaTypes.String, enum: ['0', '1', '2'] })
  @IsNotEmpty()
  @IsString()
  tujuanKunj: string

  @Prop({ type: SchemaTypes.String, enum: ['', '0', '1', '2'] })
  @IsNotEmpty()
  @IsString()
  flagProcedure: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  })
  @IsNotEmpty()
  @IsString()
  kdPenunjang: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['', '1', '2', '3', '4', '5'],
  })
  @IsNotEmpty()
  @IsString()
  assesmentPel: string

  @Prop(raw(SKDP))
  @ValidateNested()
  @IsNotEmpty()
  skdp: ISKDP

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  dpjpLayan: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noTelp: string

  @Prop({ type: SchemaTypes.Date, required: false, default: null })
  @IsNotEmpty()
  tlgPulang: Date

  @Prop({ type: SchemaTypes.Mixed })
  @IsNotEmpty()
  response: any

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const SEPSchema = SchemaFactory.createForClass(SEP)
