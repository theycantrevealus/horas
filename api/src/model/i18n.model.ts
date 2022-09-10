import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity({ name: 'i18n' })
export class I18nModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ nullable: false, type: 'char', length: 3 })
  iso_code_3: string

  @Column({ nullable: false, type: 'character varying' })
  route: string

  @Column({ nullable: false, type: 'character varying' })
  identifier: string

  @Column({ nullable: false, type: 'character varying' })
  caption: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
