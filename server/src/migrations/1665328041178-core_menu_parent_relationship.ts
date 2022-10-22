import { MigrationInterface, QueryRunner } from "typeorm";

export class coreMenuParentRelationship1665328041178 implements MigrationInterface {
    name = 'coreMenuParentRelationship1665328041178'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_menu" ALTER COLUMN "parent" SET NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "core_menu"."parent" IS 'Other menu id as parent'`);
        await queryRunner.query(`ALTER TABLE "core_menu" ALTER COLUMN "parent" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-9 22:7:23'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-9 22:7:23'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-09 21:59:54'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-09 21:59:54'`);
        await queryRunner.query(`ALTER TABLE "core_menu" ALTER COLUMN "parent" SET DEFAULT '0'`);
        await queryRunner.query(`COMMENT ON COLUMN "core_menu"."parent" IS NULL`);
        await queryRunner.query(`ALTER TABLE "core_menu" ALTER COLUMN "parent" DROP NOT NULL`);
    }

}
