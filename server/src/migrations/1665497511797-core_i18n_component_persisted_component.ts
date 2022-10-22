import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentPersistedComponent1665497511797 implements MigrationInterface {
    name = 'coreI18nComponentPersistedComponent1665497511797'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:11:54'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:11:54'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:08:50'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:08:50'`);
    }

}
