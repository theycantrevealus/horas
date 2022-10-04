import { MigrationInterface, QueryRunner } from "typeorm";

export class i18nComponentRebased1664919038438 implements MigrationInterface {
    name = 'i18nComponentRebased1664919038438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_f96b3890c0f9a45e56f8bff2d08"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "languageUid"`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD "componentsUid" uuid`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."componentsUid" IS 'Unique identifier'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-5 4:30:40'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-5 4:30:40'`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "FK_f13847eee373e39759db8541c7d" FOREIGN KEY ("componentsUid") REFERENCES "core_i18n_component"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "FK_f13847eee373e39759db8541c7d"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-03 19:34:01'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-03 19:34:01'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."componentsUid" IS 'Unique identifier'`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP COLUMN "componentsUid"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "languageUid" uuid`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_f96b3890c0f9a45e56f8bff2d08" FOREIGN KEY ("languageUid") REFERENCES "core_i18n"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
