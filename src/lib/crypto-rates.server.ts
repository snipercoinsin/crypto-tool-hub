// External price + blockchain lookups. Server-only.
// Multiple price providers with fallback (CoinGecko blocks Worker IPs with 403).
// mempool.space for BTC verification.

type Sym = "BTC" | "XMR";

const UA = {
  "user-agent":
    "Mozilla/5.0 (compatible; LovableStore/1.0; +https://lovable.dev)",
  accept: "application/json",
};

async function fromCoinbase(sym: Sym): Promise<number> {
  const r = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, {
    headers: UA,
  });
  if (!r.ok) throw new Error(`coinbase ${r.status}`);
  const j = (await r.json()) as { data?: { amount?: string } };
  const v = Number(j.data?.amount);
  if (!v || v <= 0) throw new Error("coinbase invalid");
  return v;
}

async function fromKraken(sym: Sym): Promise<number> {
  const pair = sym === "BTC" ? "XBTUSD" : "XMRUSD";
  const r = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, {
    headers: UA,
  });
  if (!r.ok) throw new Error(`kraken ${r.status}`);
  const j = (await r.json()) as { result?: Record<string, { c: string[] }> };
  const first = j.result && Object.values(j.result)[0];
  const v = Number(first?.c?.[0]);
  if (!v || v <= 0) throw new Error("kraken invalid");
  return v;
}

async function fromBinance(sym: Sym): Promise<number> {
  // Binance does not list XMR; only works for BTC
  if (sym !== "BTC") throw new Error("binance no xmr");
  const r = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    { headers: UA },
  );
  if (!r.ok) throw new Error(`binance ${r.status}`);
  const j = (await r.json()) as { price?: string };
  const v = Number(j.price);
  if (!v || v <= 0) throw new Error("binance invalid");
  return v;
}

async function fromCoinGecko(sym: Sym): Promise<number> {
  const id = sym === "BTC" ? "bitcoin" : "monero";
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    { headers: UA },
  );
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const j = (await r.json()) as Record<string, { usd: number }>;
  const v = j[id]?.usd;
  if (!v || v <= 0) throw new Error("coingecko invalid");
  return v;
}

export async function getUsdToCryptoRate(sym: Sym): Promise<number> {
  const providers = [fromCoinbase, fromKraken, fromBinance, fromCoinGecko];
  const errors: string[] = [];
  for (const p of providers) {
    try {
      return await p(sym);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  throw new Error(`Price feed unavailable (${errors.join("; ")})`);
}

// BTC: check if address has received at least `expectedSats` satoshis since `sinceUnix`.
export async function checkBtcPayment(
  address: string,
  expectedSats: number,
  sinceUnix: number,
): Promise<{ paid: boolean; txid?: string; receivedSats: number }> {
  const res = await fetch(`https://mempool.space/api/address/${address}/txs`, {
    headers: UA,
  });
  if (!res.ok) throw new Error(`Explorer unavailable (${res.status})`);
  const txs = (await res.json()) as Array<{
    txid: string;
    status: { confirmed: boolean; block_time?: number };
    vout: Array<{ scriptpubkey_address?: string; value: number }>;
  }>;
  for (const tx of txs) {
    const t = tx.status.block_time ?? Math.floor(Date.now() / 1000);
    if (t + 60 < sinceUnix) continue;
    const received = tx.vout
      .filter((v) => v.scriptpubkey_address === address)
      .reduce((s, v) => s + v.value, 0);
    if (received >= expectedSats) {
      return { paid: true, txid: tx.txid, receivedSats: received };
    }
  }
  return { paid: false, receivedSats: 0 };
}
