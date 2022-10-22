import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPersistedOrphanedHandler1665824525687 implements MigrationInterface {
    name = 'coreMenuPersistedOrphanedHandler1665824525687'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP COLUMN "servicegroup"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 16:2:7'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 16:2:7'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 14:55:51'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 14:55:51'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD "servicegroup" character varying NOT NULL`);
    }

}
