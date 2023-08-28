import {Prop, raw, Schema, SchemaFactory} from "@nestjs/mongoose";
import {HydratedDocument, SchemaTypes} from "mongoose";
import {IsArray, IsNotEmpty, IsString} from "class-validator";
import {IObat, PrbContract} from "@core/3rdparty/bpjs/contract/prb.contract";

export const Obat = raw({
  kdObat: { type: String, example: '' },
  signa1: { type: String, example: '' },
  signa2: { type: String, example: '' },
  jmlObat: { type: String, example: '' },
})

export type PRBDocument = HydratedDocument<PRB>

@Schema({collection: 'bpjs_prb'})
export class PRB implements PrbContract {
  @Prop({ type: SchemaTypes.String, unique:true })
  id: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noSrb: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noSep: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  noKartu: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  alamat: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  programPRB: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  kodeDPJP: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  keterangan: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  saran: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  user: string

  @Prop({
    type: [Obat],
  })
  @IsArray()
  obat: IObat[]
}

export const PRBSchema = SchemaFactory.createForClass(PRB)
