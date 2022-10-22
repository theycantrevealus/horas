import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentPersistedComponent1665496814548 implements MigrationInterface {
    name = 'coreI18nComponentPersistedComponent1665496814548'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:0:16'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:0:16'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 19:39:30'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 19:39:30'`);
    }

}
