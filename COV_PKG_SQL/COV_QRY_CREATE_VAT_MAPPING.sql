CREATE COLUMN TABLE "COV_SCH_VAT"."COV_VAT_MAPPING"("IN_TABLE" VARCHAR(40),"IN_FIELD" VARCHAR(40),"IN_TABLE_ALIAS" VARCHAR(20),"OUT_TABLE" VARCHAR(40),"OUT_FIELD" VARCHAR(40),"OUT_TABLE_ALIAS" VARCHAR(20),"MANDATORY" BOOLEAN, "RULE" VARCHAR(40),
PRIMARY KEY ("IN_TABLE", "IN_FIELD","OUT_TABLE", "OUT_FIELD"));