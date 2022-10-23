import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuPermissionAccountCascade1666547017165 implements MigrationInterface {
    name = 'coreMenuPermissionAccountCascade1666547017165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 0:43:39'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 0:43:39'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_9584674f79625804ea252efe2fc"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 00:41:34'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-24 00:41:34'`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_9584674f79625804ea252efe2fc" FOREIGN KEY ("permission_id") REFERENCES "core_menu_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
