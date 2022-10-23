import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPermissionAccountCascade1666541882456 implements MigrationInterface {
    name = 'coreMenuPermissionAccountCascade1666541882456'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_051d05623f303a0624cd9601425"`);
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:18:4'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:18:4'`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_051d05623f303a0624cd9601425" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" DROP CONSTRAINT "FK_051d05623f303a0624cd9601425"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:16:11'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:16:11'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "core_menu_permission" ADD CONSTRAINT "FK_051d05623f303a0624cd9601425" FOREIGN KEY ("menu_id") REFERENCES "core_menu"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

}
