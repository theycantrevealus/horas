import { MigrationInterface, QueryRunner } from "typeorm";

export class i18n1664570120041 implements MigrationInterface {
    name = 'i18n1664570120041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_weekday_enum" AS ENUM('narrow', 'short', 'long')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_era_enum" AS ENUM('narrow', 'short', 'long')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_year_enum" AS ENUM('numeric', '2-digit')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_month_enum" AS ENUM('numeric', '2-digit', 'narrow', 'short', 'long')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_day_enum" AS ENUM('numeric', '2-digit')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_hour_enum" AS ENUM('numeric', '2-digit')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_minute_enum" AS ENUM('numeric', '2-digit')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_second_enum" AS ENUM('numeric', '2-digit')`);
        await queryRunner.query(`CREATE TYPE "public"."core_i18n_datetime_timezone_name_enum" AS ENUM('short', 'long')`);
        await queryRunner.query(`CREATE TABLE "core_i18n" ("uid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "iso_2_digits" character varying(2) NOT NULL, "iso_3_digits" character varying(3) NOT NULL, "datetime_weekday" "public"."core_i18n_datetime_weekday_enum" NOT NULL DEFAULT 'short', "datetime_era" "public"."core_i18n_datetime_era_enum" NOT NULL DEFAULT 'short', "datetime_year" "public"."core_i18n_datetime_year_enum" NOT NULL DEFAULT 'numeric', "datetime_month" "public"."core_i18n_datetime_month_enum" NOT NULL DEFAULT 'numeric', "datetime_day" "public"."core_i18n_datetime_day_enum" NOT NULL DEFAULT 'numeric', "datetime_hour" "public"."core_i18n_datetime_hour_enum" NOT NULL DEFAULT 'numeric', "datetime_minute" "public"."core_i18n_datetime_minute_enum" NOT NULL DEFAULT 'numeric', "datetime_second" "public"."core_i18n_datetime_second_enum" NOT NULL DEFAULT 'numeric', "datetime_timezone_name" "public"."core_i18n_datetime_timezone_name_enum" NOT NULL DEFAULT 'short', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_b132a89527822cd0394d43e1173" PRIMARY KEY ("uid")); COMMENT ON COLUMN "core_i18n"."uid" IS 'Unique identifier'; COMMENT ON COLUMN "core_i18n"."name" IS 'Language Name'; COMMENT ON COLUMN "core_i18n"."iso_2_digits" IS 'Language Name'; COMMENT ON COLUMN "core_i18n"."iso_3_digits" IS 'Language Name'; COMMENT ON COLUMN "core_i18n"."datetime_weekday" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_era" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_year" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_month" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_day" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_hour" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_minute" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_second" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."datetime_timezone_name" IS 'https://402.ecma-international.org/2.0/#sec-InitializeDateTimeFormat'; COMMENT ON COLUMN "core_i18n"."created_at" IS 'Time when it created'; COMMENT ON COLUMN "core_i18n"."updated_at" IS 'Time when it last updated'; COMMENT ON COLUMN "core_i18n"."deleted_at" IS 'Time when it deleted. If empty that mean it''s active'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-1 3:35:22'`);
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-1 3:35:22'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core_log_activity" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-01 03:34:10'`);
        await queryRunner.query(`ALTER TABLE "core_log_login" ALTER COLUMN "logged_at" SET DEFAULT '2022-10-01 03:34:10'`);
        await queryRunner.query(`DROP TABLE "core_i18n"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_timezone_name_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_second_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_minute_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_hour_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_day_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_month_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_year_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_era_enum"`);
        await queryRunner.query(`DROP TYPE "public"."core_i18n_datetime_weekday_enum"`);
    }

}
