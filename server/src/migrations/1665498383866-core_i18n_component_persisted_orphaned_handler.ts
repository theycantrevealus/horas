import { MigrationInterface, QueryRunner } from "typeorm";

export class coreI18nComponentPersistedOrphanedHandler1665498383866 implements MigrationInterface {
    name = 'coreI18nComponentPersistedOrphanedHandler1665498383866'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_a6abf41a24a602acf08fdea556d"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:26:26'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:26:26'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_a6abf41a24a602acf08fdea556d" FOREIGN KEY ("language_id") REFERENCES "core_i18n"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_a6abf41a24a602acf08fdea556d"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:22:59'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:22:59'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_a6abf41a24a602acf08fdea556d" FOREIGN KEY ("language_id") REFERENCES "core_i18n"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
