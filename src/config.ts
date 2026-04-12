import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-ohlcv",
  slug: "token-ohlcv",
  description: "Historical OHLCV candlestick data for any token via CoinGecko and GeckoTerminal.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/candles",
      price: "$0.002",
      description: "Get historical OHLCV candles for any token by ID or contract address",
      toolName: "token_get_ohlcv_history",
      toolDescription:
        "Use this when you need historical price candlestick data for any token. Returns OHLCV (open, high, low, close, volume) candles for any time interval. Supports all CoinGecko-listed tokens by ID (e.g. bitcoin, ethereum) and on-chain tokens by contract address via GeckoTerminal. Do NOT use for real-time orderbook — use hyperliquid_get_market_data. Do NOT use for swap quotes — use dex_get_swap_quote or jupiter_get_swap_quote. Do NOT use for news — use crypto_get_latest_news. Do NOT use for funding rates — use perp_scan_funding_arbitrage.",
      inputSchema: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              "CoinGecko token ID (e.g. bitcoin, ethereum, solana). Use this OR contract+chain.",
          },
          contract: {
            type: "string",
            description:
              "On-chain contract address (e.g. 0x...). Use with chain parameter for GeckoTerminal lookup.",
          },
          chain: {
            type: "string",
            description:
              "Blockchain network for contract lookup: base, ethereum, solana, arbitrum, polygon, optimism, bsc.",
          },
          days: {
            type: "number",
            description:
              "Number of days of history (default 30, max 365). For 1h interval max 2 days, for 4h max 90 days.",
          },
          interval: {
            type: "string",
            description:
              "Candle interval: daily (default), 4h (if days <= 90), 1h (if days <= 2).",
          },
        },
        required: [],
      },
    },
  ],
};
