import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPermissionAccountCascade1666541280996 implements MigrationInterface {
    name = 'coreMenuPermissionAccountCascade1666541280996'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:8:3'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:8:3'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:04:03'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 23:04:03'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE RESTRICT ON UPDATE RESTRICT`);
    }

}
