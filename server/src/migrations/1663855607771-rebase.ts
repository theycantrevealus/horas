import { MigrationInterface, QueryRunner } from "typeorm";

export class rebase1663855607771 implements MigrationInterface {
    name = 'rebase1663855607771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "menu_group" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_1b4355838e113a92087ecb039ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "menu" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "identifier" character varying NOT NULL, "url" text DEFAULT '/', "parent" integer NOT NULL, "icon" character varying NOT NULL, "show_on_menu" character(1) NOT NULL, "show_order" integer NOT NULL, "level" integer, "group_color" character varying, "remark" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "menuGroupId" integer, CONSTRAINT "PK_35b2a8f47d153ff7a41860cceeb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "menu_permission" ("id" SERIAL NOT NULL, "domiden" character varying NOT NULL, "dispatchname" character varying NOT NULL, "servicegroup" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "menuId" integer, CONSTRAINT "PK_7a69d87de538c0e8ad05c1a1820" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account_permission" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "accountUid" uuid, "permissionId" integer, "grantedByUid" uuid, CONSTRAINT "PK_202247292378cf3913a1edb41a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account_privileges" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "accountUid" uuid, "menuId" integer, "grantedByUid" uuid, CONSTRAINT "PK_220630f27107c502435de080e05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "core_log_login" DROP COLUMN "token"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ADD "method" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "core_log_login" DROP CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" DROP CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b"`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "UQ_402c2e1486caf21fd72ee7c5b1f" UNIQUE ("uid")`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-22T14:06:50.194Z'`);
        await queryRunner.query(`ALTER TABLE "menu" ADD CONSTRAINT "FK_c68620d2c627287350bda5f1f15" FOREIGN KEY ("menuGroupId") REFERENCES "menu_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "menu_permission" ADD CONSTRAINT "FK_c57de8fc6071e94f9fd4199980c" FOREIGN KEY ("menuId") REFERENCES "menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_92972dc223758e9791a251a8939" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_0fa360f1517ea22443174914e58" FOREIGN KEY ("permissionId") REFERENCES "menu_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_permission" ADD CONSTRAINT "FK_4ae38023725559db026a13b1e7f" FOREIGN KEY ("grantedByUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_privileges" ADD CONSTRAINT "FK_20e1afaaf5bcdb4d7bba56962a7" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_privileges" ADD CONSTRAINT "FK_b7ce5fe7d4642668571b7724d80" FOREIGN KEY ("menuId") REFERENCES "menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_privileges" ADD CONSTRAINT "FK_d8a8574c0da2eed1971d54c52fb" FOREIGN KEY ("grantedByUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ADD CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ADD CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" DROP CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" DROP CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61"`);
        await queryRunner.query(`ALTER TABLE "account_privileges" DROP CONSTRAINT "FK_d8a8574c0da2eed1971d54c52fb"`);
        await queryRunner.query(`ALTER TABLE "account_privileges" DROP CONSTRAINT "FK_b7ce5fe7d4642668571b7724d80"`);
        await queryRunner.query(`ALTER TABLE "account_privileges" DROP CONSTRAINT "FK_20e1afaaf5bcdb4d7bba56962a7"`);
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_4ae38023725559db026a13b1e7f"`);
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_0fa360f1517ea22443174914e58"`);
        await queryRunner.query(`ALTER TABLE "account_permission" DROP CONSTRAINT "FK_92972dc223758e9791a251a8939"`);
        await queryRunner.query(`ALTER TABLE "menu_permission" DROP CONSTRAINT "FK_c57de8fc6071e94f9fd4199980c"`);
        await queryRunner.query(`ALTER TABLE "menu" DROP CONSTRAINT "FK_c68620d2c627287350bda5f1f15"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-09-19 16:25:48.478'`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "UQ_402c2e1486caf21fd72ee7c5b1f"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ADD CONSTRAINT "FK_4b1a6eae17c69db92a13c2be64b" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ADD CONSTRAINT "FK_e8ff97ff5cb2eaba92756055d61" FOREIGN KEY ("accountUid") REFERENCES "account"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" DROP COLUMN "method"`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ADD "token" text NOT NULL`);
        await queryRunner.query(`DROP TABLE "account_privileges"`);
        await queryRunner.query(`DROP TABLE "account_permission"`);
        await queryRunner.query(`DROP TABLE "menu_permission"`);
        await queryRunner.query(`DROP TABLE "menu"`);
        await queryRunner.query(`DROP TABLE "menu_group"`);
    }

}
