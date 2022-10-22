import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPersistedOrphanedHandler1665820549149 implements MigrationInterface {
    name = 'coreMenuPersistedOrphanedHandler1665820549149'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_152c364766942de903e4b9b074d"`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" RENAME COLUMN "menuId" TO "menu_id"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 14:55:51'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 14:55:51'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_051d05623f303a0624cd9601425" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_051d05623f303a0624cd9601425"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:26:26'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-11 21:26:26'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" RENAME COLUMN "menu_id" TO "menuId"`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_152c364766942de903e4b9b074d" FOREIGN KEY ("menuId") REFERENCES "core_menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
