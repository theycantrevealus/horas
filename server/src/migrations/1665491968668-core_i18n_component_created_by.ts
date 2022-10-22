import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentCreatedBy1665491968668 implements MigrationInterface {
    name = 'coreI18nComponentCreatedBy1665491968668'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_49262f1c00d60c8a09475e33697"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 19:39:30'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 19:39:30'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-09 22:07:23'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-09 22:07:23'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "createdById" integer`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_49262f1c00d60c8a09475e33697" FOREIGN KEY ("createdById") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
