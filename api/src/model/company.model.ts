import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'

@Entity({ name: 'company' })
export class LicenseModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column({ nullable: false, type: 'uuid', primary: true })
  uid: string

  @Column({ nullable: false, type: 'character varying' })
  name: string

  @Column({ nullable: false, type: 'character varying' })
  address: string

  @Column({ nullable: false, type: 'character varying' })
  contact: string

  @Column({ nullable: false, type: 'character varying' })
  country: string

  @Column({ nullable: false, type: 'character varying' })
  province: string

  @Column({ nullable: false, type: 'character varying' })
  pic: string

  @Column({ nullable: false, type: 'character varying' })
  city: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
