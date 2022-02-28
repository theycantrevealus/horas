import {
    Entity,
    Column,
    PrimaryColumn,
    Generated,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'account_authority' })
export class AccountAuthorityModel {
    @PrimaryColumn()
    @Generated('uuid')
    @Column({ nullable: false, type: 'uuid', primary: true })
    uid: string;

    @Column({ nullable: false, type: 'character varying' })
    name: string;

    @CreateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    created_at: Date;

    @UpdateDateColumn({ nullable: false, type: 'timestamp without time zone' })
    updated_at: Date;

    @DeleteDateColumn({ nullable: true, type: 'timestamp without time zone' })
    deleted_at: Date;
}
