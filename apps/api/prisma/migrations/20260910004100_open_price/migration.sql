-- AlterTable
ALTER TABLE "services" ADD COLUMN "open_price" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "price_pending" BOOLEAN NOT NULL DEFAULT false;
