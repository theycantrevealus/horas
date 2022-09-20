import { MigrationInterface, QueryRunner } from "typeorm";

export class account1663572065265 implements MigrationInterface {
    name = 'account1663572065265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-19T07:21:07.712Z'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-19 07:08:15.184'`);
    }

}
