import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPermissionAccountCascade1666546514455 implements MigrationInterface {
    name = 'coreMenuPermissionAccountCascade1666546514455'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_051d05623f303a0624cd9601425"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 0:35:17'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 0:35:17'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_051d05623f303a0624cd9601425" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_051d05623f303a0624cd9601425"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:18:04'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:18:04'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_051d05623f303a0624cd9601425" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
