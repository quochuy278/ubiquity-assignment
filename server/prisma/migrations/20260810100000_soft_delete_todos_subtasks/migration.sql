-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubTask" ADD COLUMN "deletedAt" TIMESTAMP(3);
