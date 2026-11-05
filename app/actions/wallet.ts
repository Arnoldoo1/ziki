"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { swap, SwapRefused } from "@/lib/wallet/ledger";
import type { SwapSide } from "@/lib/wallet/rules";

export type SwapActionResult = { ok?: true; error?: string };

/** Buy ZIKI with cash, or sell ZIKI for cash, at the pilot's fixed price (#ziki-wallet). */
export async function swapAction(side: SwapSide, amount: number): Promise<SwapActionResult> {
  const user = await requireUser();
  if (side !== "buy" && side !== "sell") return { error: "Choose Buy or Sell." };
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount above zero." };
  try {
    await swap(user.id, side, amount);
  } catch (error) {
    if (error instanceof SwapRefused) return { error: error.message };
    throw error;
  }
  revalidatePath("/wallet");
  return { ok: true };
}
