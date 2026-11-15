-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchasePrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_itemId_recordedAt_idx" ON "PriceHistory"("itemId", "recordedAt");

-- CreateIndex
CREATE INDEX "Item_userId_createdAt_idx" ON "Item"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Item_userId_price_idx" ON "Item"("userId", "price");

-- CreateIndex
CREATE INDEX "Item_userId_name_idx" ON "Item"("userId", "name");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "PriceHistory" ("id","price","recordedAt","itemId") SELECT 'ph_' || "id", "price", "createdAt", "id" FROM "Item" WHERE "price" IS NOT NULL;
