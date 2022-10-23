import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPermissionAccount1666537104129 implements MigrationInterface {
    name = 'coreMenuPermissionAccount1666537104129'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_0fa360f1517ea22443174914e58"`);
        await queryRunner.query(`ALTER TABLE "account_permission" RENAME COLUMN "permissionId" TO "permission_id"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 21:58:26'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-23 21:58:26'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 16:02:07'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-15 16:02:07'`);
        await queryRunner.query(`ALTER TABLE "account_permission" RENAME COLUMN "permission_id" TO "permissionId"`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_0fa360f1517ea22443174914e58" FOREIGN KEY ("permissionId") REFERENCES "core_menu_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
