import { MigrationInterface, QueryRunner } from "typeorm";

export class i18nComponentJoined1664800439638 implements MigrationInterface {
    name = 'i18nComponentJoined1664800439638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD "language_code" character varying(2) NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."language_code" IS 'Country language code 2 digits'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "translation" character varying NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n_component"."translation" IS 'Translation value'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."iso_2_digits" IS 'Country code 2 digits'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."iso_3_digits" IS 'Country code 3 digits'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-3 19:34:1'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-3 19:34:1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-02 21:43:52'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-02 21:43:52'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."iso_3_digits" IS 'Language Name'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."iso_2_digits" IS 'Language Name'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n_component"."translation" IS 'Translation value'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "translation"`);
        await queryRunner.query(`COMMENT ON COLUMN "core_i18n"."language_code" IS 'Country language code 2 digits'`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP COLUMN "language_code"`);
    }

}
