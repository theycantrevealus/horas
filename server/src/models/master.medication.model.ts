import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryColumn,
  Generated,
} from 'typeorm'
import { IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MasterItemModel } from './master.item.model'
import { properties } from '@/utilities/models/column'

@Entity({ name: 'master_medication' })
export class MasterMedicationModel extends MasterItemModel {
  @ApiProperty({
    example: 'Generic name',
    description: 'Drug generic name',
  })
  @Column({ nullable: false, type: 'character varying' })
  generic_name: string

  @ApiProperty({
    example: 'Drugs Alias, Another Alias, And Other Alias',
    description: 'Common known drug aliases to help searching',
  })
  @Column({ nullable: false, type: 'character varying' })
  aliases: string

  @CreateDateColumn(properties.created_at)
  created_at: Date

  @UpdateDateColumn(properties.updated_at)
  updated_at: Date

  @DeleteDateColumn(properties.deleted_at)
  deleted_at: Date
}
