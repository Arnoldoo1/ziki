-- #ziki-wallet: the ZIKI wallet ledger. Every movement of cash or ZIKI is one
-- permanent entry; balances are sums of entries.
-- CreateEnum
CREATE TYPE "WalletAsset" AS ENUM ('usd', 'ziki');

-- CreateEnum
CREATE TYPE "WalletEntryKind" AS ENUM ('genesis', 'swap_buy', 'swap_sell', 'swap_fee', 'reward', 'spend');

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "system" TEXT,
    "asset" "WalletAsset" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "kind" "WalletEntryKind" NOT NULL,
    "transferId" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletEntry_userId_asset_idx" ON "WalletEntry"("userId", "asset");

-- CreateIndex
CREATE INDEX "WalletEntry_userId_createdAt_idx" ON "WalletEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletEntry_system_asset_idx" ON "WalletEntry"("system", "asset");

-- CreateIndex
CREATE INDEX "WalletEntry_transferId_idx" ON "WalletEntry"("transferId");

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
