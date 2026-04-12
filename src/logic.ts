import type { Hono } from "hono";

// --------------- Cache ---------------
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// --------------- Types ---------------
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

// --------------- Chain mapping for GeckoTerminal ---------------
const CHAIN_MAP: Record<string, string> = {
  base: "base",
  ethereum: "eth",
  eth: "eth",
  solana: "solana",
  sol: "solana",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  polygon: "polygon-pos",
  matic: "polygon-pos",
  optimism: "optimism",
  op: "optimism",
  bsc: "bsc",
  bnb: "bsc",
  avalanche: "avax",
  avax: "avax",
};

// --------------- CoinGecko OHLC ---------------

async function fetchCoinGeckoOHLC(tokenId: string, days: number): Promise<Candle[]> {
  // CoinGecko OHLC endpoint: returns [timestamp, open, high, low, close]
  // Candle granularity: 1-2 days = 30m, 3-30 days = 4h, 31+ days = 4d
  // We use the /ohlc endpoint for OHLC and supplement volume from /market_chart
  const url = `https://api.coingecko.com/api/v3/coins/${tokenId}/ohlc?vs_currency=usd&days=${days}`;

  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`CoinGecko OHLC returned ${resp.status}`);

  const data: number[][] = await resp.json();
  if (!Array.isArray(data)) throw new Error("Invalid OHLC response");

  // Fetch volume data from market_chart
  const volumeMap = await fetchCoinGeckoVolumes(tokenId, days);

  return data.map((candle) => {
    const ts = candle[0];
    return {
      timestamp: ts,
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: findClosestVolume(volumeMap, ts),
    };
  });
}

async function fetchCoinGeckoVolumes(tokenId: string, days: number): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) return map;

    const data: any = await resp.json();
    const volumes: number[][] = data?.total_volumes || [];

    for (const [ts, vol] of volumes) {
      map.set(ts, vol);
    }
  } catch {
    // Volume supplement is best-effort
  }
  return map;
}

function findClosestVolume(volumeMap: Map<number, number>, timestamp: number): number | null {
  if (volumeMap.size === 0) return null;

  // Find volume entry closest to this candle timestamp (within 4h window)
  let closest: number | null = null;
  let minDiff = 4 * 60 * 60 * 1000; // 4h max diff

  for (const [ts, vol] of volumeMap) {
    const diff = Math.abs(ts - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = vol;
    }
  }
  return closest;
}

// --------------- GeckoTerminal OHLCV ---------------

async function fetchGeckoTerminalOHLCV(
  chain: string,
  contractAddress: string,
  days: number,
  interval: string,
): Promise<Candle[]> {
  const network = CHAIN_MAP[chain.toLowerCase()] || chain.toLowerCase();

  // First, find the top pool for this token
  const poolUrl = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${contractAddress}/pools?sort=h24_volume_usd_desc&page=1`;
  const poolResp = await fetch(poolUrl, { headers: { Accept: "application/json" } });
  if (!poolResp.ok) throw new Error(`GeckoTerminal pools returned ${poolResp.status}`);

  const poolData: any = await poolResp.json();
  const pools = poolData?.data || [];
  if (pools.length === 0) throw new Error("No pools found for this token on " + network);

  const poolAddress = pools[0].attributes?.address || pools[0].id?.split("_")?.[1];
  if (!poolAddress) throw new Error("Could not determine pool address");

  // Map interval to GeckoTerminal timeframe
  let timeframe: string;
  let aggregate: number;
  let limit: number;

  if (interval === "1h") {
    timeframe = "hour";
    aggregate = 1;
    limit = Math.min(days * 24, 1000);
  } else if (interval === "4h") {
    timeframe = "hour";
    aggregate = 4;
    limit = Math.min(days * 6, 1000);
  } else {
    timeframe = "day";
    aggregate = 1;
    limit = Math.min(days, 1000);
  }

  const ohlcvUrl = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`;
  const ohlcvResp = await fetch(ohlcvUrl, { headers: { Accept: "application/json" } });
  if (!ohlcvResp.ok) throw new Error(`GeckoTerminal OHLCV returned ${ohlcvResp.status}`);

  const ohlcvData: any = await ohlcvResp.json();
  const ohlcvList: any[] = ohlcvData?.data?.attributes?.ohlcv_list || [];

  return ohlcvList.map((item: any) => ({
    timestamp: item[0] * 1000, // GeckoTerminal returns seconds, convert to ms
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]) || null,
  }));
}

// --------------- Main logic ---------------

async function getCandles(
  token?: string,
  contract?: string,
  chain?: string,
  days: number = 30,
  interval: string = "daily",
): Promise<{
  candles: Candle[];
  source: string;
  tokenId: string;
  interval: string;
  days: number;
}> {
  // Validate interval constraints
  if (interval === "1h" && days > 2) days = 2;
  if (interval === "4h" && days > 90) days = 90;
  if (days > 365) days = 365;

  const cacheKey = `ohlcv_${token || contract}_${chain || "cg"}_${days}_${interval}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  let candles: Candle[];
  let source: string;
  let tokenId: string;

  if (contract && chain) {
    // Use GeckoTerminal for on-chain tokens
    candles = await fetchGeckoTerminalOHLCV(chain, contract, days, interval);
    source = "GeckoTerminal";
    tokenId = `${chain}:${contract.slice(0, 10)}...`;
  } else if (token) {
    // Use CoinGecko for listed tokens
    candles = await fetchCoinGeckoOHLC(token.toLowerCase(), days);
    source = "CoinGecko";
    tokenId = token.toLowerCase();
  } else {
    throw new Error("Provide either 'token' (CoinGecko ID) or 'contract' + 'chain' params.");
  }

  // Sort by timestamp ascending
  candles.sort((a, b) => a.timestamp - b.timestamp);

  const result = { candles, source, tokenId, interval, days };
  setCache(cacheKey, result);
  return result;
}

// --------------- Routes ---------------

export function registerRoutes(app: Hono) {
  app.get("/api/candles", async (c) => {
    const token = c.req.query("token") || undefined;
    const contract = c.req.query("contract") || undefined;
    const chain = c.req.query("chain") || undefined;
    const days = Math.min(parseInt(c.req.query("days") || "30", 10) || 30, 365);
    const interval = c.req.query("interval") || "daily";

    // Validate interval
    const validIntervals = ["daily", "4h", "1h"];
    if (!validIntervals.includes(interval)) {
      return c.json({
        error: "Invalid interval. Use: daily, 4h, or 1h",
        constraints: {
          daily: "any days up to 365",
          "4h": "days <= 90",
          "1h": "days <= 2",
        },
      }, 400);
    }

    if (!token && !contract) {
      return c.json({
        error: "Missing required parameter. Provide 'token' (CoinGecko ID like 'bitcoin') or 'contract' + 'chain'.",
        examples: [
          "/api/candles?token=bitcoin&days=30&interval=daily",
          "/api/candles?contract=0x...&chain=base&days=7&interval=4h",
        ],
      }, 400);
    }

    if (contract && !chain) {
      return c.json({
        error: "When using 'contract', you must also provide 'chain' parameter.",
        supportedChains: Object.keys(CHAIN_MAP),
      }, 400);
    }

    try {
      const result = await getCandles(token, contract, chain, days, interval);

      if (result.candles.length === 0) {
        return c.json({
          results: 0,
          source: result.source,
          tokenId: result.tokenId,
          interval: result.interval,
          days: result.days,
          candles: [],
          message: "No OHLCV data available for this token/period combination.",
        });
      }

      const first = result.candles[0];
      const last = result.candles[result.candles.length - 1];
      const priceChange = last.close - first.open;
      const priceChangePct = ((priceChange / first.open) * 100).toFixed(2);
      const highOfPeriod = Math.max(...result.candles.map((c) => c.high));
      const lowOfPeriod = Math.min(...result.candles.map((c) => c.low));

      return c.json({
        results: result.candles.length,
        source: result.source,
        tokenId: result.tokenId,
        interval: result.interval,
        days: result.days,
        summary: {
          firstOpen: first.open,
          lastClose: last.close,
          priceChange,
          priceChangePct: `${priceChangePct}%`,
          periodHigh: highOfPeriod,
          periodLow: lowOfPeriod,
          from: new Date(first.timestamp).toISOString(),
          to: new Date(last.timestamp).toISOString(),
        },
        cachedFor: "5m",
        timestamp: new Date().toISOString(),
        candles: result.candles,
      });
    } catch (err: any) {
      return c.json({ error: "Failed to fetch OHLCV data", details: err.message }, 502);
    }
  });
}
