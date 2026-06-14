// External price + blockchain lookups. Server-only.
// CoinGecko (free, no key) for USD->crypto. mempool.space for BTC verification.

type Sym = "BTC" | "XMR";
const CG_ID: Record<Sym, string> = { BTC: "bitcoin", XMR: "monero" };

export async function getUsdToCryptoRate(sym: Sym): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${CG_ID[sym]}&vs_currencies=usd`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Price feed unavailable (${res.status})`);
  const json = (await res.json()) as Record<string, { usd: number }>;
  const usd = json[CG_ID[sym]]?.usd;
  if (!usd || usd <= 0) throw new Error("Price feed returned invalid data");
  return usd; // 1 unit of crypto = X USD
}

export function convertUsdToCrypto(usd: number, pricePerUnitUsd: number): number {
  const amt = usd / pricePerUnitUsd;
  // round up to 8 decimals for BTC; 12 for XMR
  return amt;
}

// BTC: check if address has received at least `expectedSats` satoshis since `sinceUnix`.
export async function checkBtcPayment(
  address: string,
  expectedSats: number,
  sinceUnix: number,
): Promise<{ paid: boolean; txid?: string; receivedSats: number }> {
  // mempool.space free public API
  const res = await fetch(`https://mempool.space/api/address/${address}/txs`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Explorer unavailable (${res.status})`);
  const txs = (await res.json()) as Array<{
    txid: string;
    status: { confirmed: boolean; block_time?: number };
    vout: Array<{ scriptpubkey_address?: string; value: number }>;
  }>;
  for (const tx of txs) {
    // Only consider txs at or after order creation
    const t = tx.status.block_time ?? Math.floor(Date.now() / 1000);
    if (t + 60 < sinceUnix) continue; // skip clearly older
    const received = tx.vout
      .filter((v) => v.scriptpubkey_address === address)
      .reduce((s, v) => s + v.value, 0);
    if (received >= expectedSats) {
      return { paid: true, txid: tx.txid, receivedSats: received };
    }
  }
  return { paid: false, receivedSats: 0 };
}
