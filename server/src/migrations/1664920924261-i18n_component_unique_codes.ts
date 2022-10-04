import { MigrationInterface, QueryRunner } from "typeorm";

export class i18nComponentUniqueCodes1664920924261 implements MigrationInterface {
    name = 'i18nComponentUniqueCodes1664920924261'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "UQ_66b188d7d16c9de0b71f1715bd6" UNIQUE ("language_code")`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "UQ_f68501be1d0d740e1ef6f31ebcc" UNIQUE ("iso_2_digits")`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "UQ_d8689e54263de65e8ab4e10a4a4" UNIQUE ("iso_3_digits")`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-5 5:2:6'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-5 5:2:6'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-05 04:30:40'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-05 04:30:40'`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "UQ_d8689e54263de65e8ab4e10a4a4"`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "UQ_f68501be1d0d740e1ef6f31ebcc"`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "UQ_66b188d7d16c9de0b71f1715bd6"`);
    }

}
