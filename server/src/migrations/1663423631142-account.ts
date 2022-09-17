import { MigrationInterface, QueryRunner } from "typeorm";

export class account1663423631142 implements MigrationInterface {
    name = 'account1663423631142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "account_authority" ("uid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_f50f7e7c04655f7bd213e89dd1f" PRIMARY KEY ("uid"))`);
        await queryRunner.query(`CREATE TABLE "account" ("uid" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "password" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "authorityUid" uuid, CONSTRAINT "PK_402c2e1486caf21fd72ee7c5b1f" PRIMARY KEY ("uid"))`);
        await queryRunner.query(`CREATE TABLE "core_log_login" ("id" SERIAL NOT NULL, "log_meta" text NOT NULL, "token" text NOT NULL, "logged_at" TIMESTAMP NOT NULL DEFAULT now(), "accountUid" uuid, CONSTRAINT "PK_43616cb6981ca08c669284449d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "core_log_activity" ("id" SERIAL NOT NULL, "table_target" character varying NOT NULL, "table_identifier" character varying NOT NULL, "log_meta" text NOT NULL, "action" character(1) NOT NULL, "old_meta" text NOT NULL, "new_meta" text NOT NULL, "logged_at" TIMESTAMP NOT NULL DEFAULT now(), "accountUid" uuid, "loginIdId" integer, CONSTRAINT "PK_2afee75f903c12f36875a8ed6a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_0f1f855f1020745053b36087e2a" FOREIGN KEY ("authorityUid") REFERENCES "account_authority"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ADD CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ADD CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ADD CONSTRAINT "FK_aea4dca783bbf5b5df82c5f0641" FOREIGN KEY ("loginIdId") REFERENCES "core_log_login"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" DROP CONSTRAINT "FK_aea4dca783bbf5b5df82c5f0641"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" DROP CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" DROP CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_0f1f855f1020745053b36087e2a"`);
        await queryRunner.query(`DROP TABLE "core_log_activity"`);
        await queryRunner.query(`DROP TABLE "core_log_login"`);
        await queryRunner.query(`DROP TABLE "account"`);
        await queryRunner.query(`DROP TABLE "account_authority"`);
    }

}
