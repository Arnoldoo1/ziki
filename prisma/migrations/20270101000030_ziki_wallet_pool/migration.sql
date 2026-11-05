-- #ziki-wallet: the swap pool's starting balance, $10,000 and 250,000 ZIKI
-- (lib/wallet/rules.ts). Fixed ids, so it is written once.
INSERT INTO "WalletEntry" ("id", "userId", "system", "asset", "amount", "kind", "transferId", "memo")
VALUES
  ('wallet-genesis-pool-usd', NULL, 'pool', 'usd', 10000, 'genesis', 'wallet-genesis', 'Pool opened with $10,000'),
  ('wallet-genesis-pool-ziki', NULL, 'pool', 'ziki', 250000, 'genesis', 'wallet-genesis', 'Pool opened with 250,000 ZIKI')
ON CONFLICT ("id") DO NOTHING;
