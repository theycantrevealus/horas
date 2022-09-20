import { MigrationInterface, QueryRunner } from "typeorm";

export class accountLoginIdCascade1663604746078 implements MigrationInterface {
    name = 'accountLoginIdCascade1663604746078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-19T16:25:48.478Z'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-19 16:25:20.18'`);
    }

}
