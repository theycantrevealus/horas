import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentPersistedComponent1665497003005 implements MigrationInterface {
    name = 'coreI18nComponentPersistedComponent1665497003005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "FK_3cfc060fb3bc42465207a293756"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_b45aa82aad72224dee29b440118"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_c4aaa19bcf4ec2e4855f1bc58b4"`);
        await queryRunner.query(`ALTER TABLE "core_i18n" RENAME COLUMN "createdById" TO "account_id"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "menuId"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "language_uid"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "menu_id" integer`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "language_id" integer`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:3:25'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:3:25'`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "FK_d77f2d7cea0535f7b1576f27e53" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_ef3eb2e0695e15272be2d484756" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_a6abf41a24a602acf08fdea556d" FOREIGN KEY ("language_id") REFERENCES "core_i18n"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_a6abf41a24a602acf08fdea556d"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_ef3eb2e0695e15272be2d484756"`);
        await queryRunner.query(`ALTER TABLE "core_i18n" DROP CONSTRAINT "FK_d77f2d7cea0535f7b1576f27e53"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:00:16'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:00:16'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "language_id"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP COLUMN "menu_id"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "language_uid" integer`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD "menuId" integer`);
        await queryRunner.query(`ALTER TABLE "core_i18n" RENAME COLUMN "account_id" TO "createdById"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_c4aaa19bcf4ec2e4855f1bc58b4" FOREIGN KEY ("menuId") REFERENCES "core_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_b45aa82aad72224dee29b440118" FOREIGN KEY ("language_uid") REFERENCES "core_i18n"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_i18n" ADD CONSTRAINT "FK_3cfc060fb3bc42465207a293756" FOREIGN KEY ("createdById") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
