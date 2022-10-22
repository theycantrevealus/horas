import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentPersistedComponent1665497328579 implements MigrationInterface {
    name = 'coreI18nComponentPersistedComponent1665497328579'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_ef3eb2e0695e15272be2d484756"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:8:50'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:8:50'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_ef3eb2e0695e15272be2d484756" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_ef3eb2e0695e15272be2d484756"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:05:19'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:05:19'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_ef3eb2e0695e15272be2d484756" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
