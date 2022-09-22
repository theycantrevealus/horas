import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm'
import { CoreMenuGroupModel } from '@models/core.menu.group.model'
import { IsNumber, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

@Entity({ name: 'menu' })
export class CoreMenuModel {
  @PrimaryGeneratedColumn('increment')
  id: number

  @ApiProperty({
    example: 'Menu caption',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  name: string

  @ApiProperty({
    example: 'Identifier',
    description: 'Vue 3 support',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  identifier: string

  @ApiProperty({
    example: '/tester/url',
    description: 'Vue 3 route support',
  })
  @IsString()
  @Column({ nullable: true, type: 'text', default: '/' })
  url: string

  @ApiProperty({
    example: 1,
    description: 'Other menu id as parent',
  })
  @IsNumber()
  @Column({ type: 'integer' })
  parent: number

  @ApiProperty({
    example: 'Menu Grouper Name',
    description: 'Vue 3 support',
  })
  @ValidateNested()
  @ManyToOne(() => CoreMenuGroupModel, (menu) => menu.id)
  menu_group: CoreMenuGroupModel

  @ApiProperty({
    example: '',
    description: 'PrimeIcon class name',
  })
  @IsString()
  @Column({ nullable: false, type: 'character varying' })
  icon: string

  @ApiProperty({
    example: 'Y',
    enum: ['Y', 'N'],
    description: 'Y = show, N = hide',
  })
  @IsString()
  @Column({ nullable: false, type: 'char', length: 1 })
  show_on_menu: string

  @ApiProperty({
    example: 1,
    description: 'Showing order on side panel',
  })
  @IsNumber()
  @Column({ type: 'integer' })
  show_order: number

  @ApiProperty({
    example: 1,
    description: 'Level grouping identifier',
  })
  @IsString()
  @Column({ type: 'integer', nullable: true })
  level: number

  @ApiProperty({
    example: '',
    description: 'Theme customer class name for styling',
  })
  @IsString()
  @Column({ type: 'character varying', nullable: true })
  group_color: string

  @ApiProperty({
    example: 'Just remark something to describe menu',
    required: false,
  })
  @IsString()
  @Column({ type: 'text' })
  remark: string

  @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  created_at: Date

  @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
  updated_at: Date

  @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
  deleted_at: Date
}
