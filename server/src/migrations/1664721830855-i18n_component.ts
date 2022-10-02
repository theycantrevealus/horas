import { MigrationInterface, QueryRunner } from "typeorm";

export class i18nComponent1664721830855 implements MigrationInterface {
    name = 'i18nComponent1664721830855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "core_i18n_component" ("uid" uuid NOT NULL DEFAULT uuid_generate_v4(), "component" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "languageUid" uuid, "menuId" integer, CONSTRAINT "PK_5be63697365c87459c648874a8c" PRIMARY KEY ("uid")); COMMENT ON COLUMN "core_i18n_component"."uid" IS 'Unique identifier'; COMMENT ON COLUMN "core_i18n_component"."component" IS 'Component Identifier'; COMMENT ON COLUMN "core_i18n_component"."created_at" IS 'Time when it created'; COMMENT ON COLUMN "core_i18n_component"."updated_at" IS 'Time when it last updated'; COMMENT ON COLUMN "core_i18n_component"."deleted_at" IS 'Time when it deleted. If empty that mean it''s active'; COMMENT ON COLUMN "core_i18n_component"."languageUid" IS 'Unique identifier'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-2 21:43:52'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-2 21:43:52'`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_f96b3890c0f9a45e56f8bff2d08" FOREIGN KEY ("languageUid") REFERENCES "core_i18n"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" ADD CONSTRAINT "FK_c4aaa19bcf4ec2e4855f1bc58b4" FOREIGN KEY ("menuId") REFERENCES "menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_c4aaa19bcf4ec2e4855f1bc58b4"`);
        await queryRunner.query(`ALTER TABLE "core_i18n_component" DROP CONSTRAINT "FK_f96b3890c0f9a45e56f8bff2d08"`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-02 21:40:33'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-02 21:40:33'`);
        await queryRunner.query(`DROP TABLE "core_i18n_component"`);
    }

}
