import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
} from 'typeorm'

@Entity({ name: 'license' })
export class LicenseModel {
  @PrimaryColumn()
  @Generated('uuid')
  @Column({ nullable: false, type: 'uuid', primary: true })
  uid: string

  @Column({ nullable: false, type: 'character varying' })
  email: string

  @Column({ nullable: false, type: 'character varying' })
  first_name: string

  @Column({ nullable: false, type: 'character varying' })
  last_name: string

  @Column({ nullable: false, type: 'character varying' })
  country: string

  @Column({ nullable: false, type: 'character varying' })
  province: string

  @Column({ nullable: false, type: 'character varying' })
  city: string

  @Column({ nullable: false, type: 'uuid' })
  company: string

  @Column({ nullable: false, type: 'uuid' })
  company_unit: string

  @Column({ nullable: false, type: 'timestamptz' })
  valid_from: Date

  @Column({ nullable: false, type: 'timestamptz' })
  valid_until: Date

  @Column({ nullable: false, type: 'character varying' })
  private_key_password: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
