import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "token-ohlcv",
  slug: "token-ohlcv",
  description: "Historical OHLCV candles for any token -- daily, 4h, 1h intervals. CoinGecko + GeckoTerminal powered.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/candles",
      price: "$0.002",
      description: "Get historical OHLCV candles for any token by ID or contract address",
      toolName: "token_get_ohlcv_history",
      toolDescription: `Use this when you need historical price candlestick data for any token. Returns OHLCV candles in JSON.

1. candles: array of candlestick objects with timestamp, open, high, low, close, volume
2. token: token identifier used
3. interval: candle interval (daily, 4h, 1h)
4. days: number of days of history returned
5. source: data source (CoinGecko or GeckoTerminal)

Example output: {"candles":[{"timestamp":1712966400,"open":3105.20,"high":3142.80,"low":3089.50,"close":3128.60,"volume":1250000000}],"token":"ethereum","interval":"daily","days":30,"source":"CoinGecko"}

Use this FOR technical analysis, backtesting, trend detection, and charting. Supports 10,000+ tokens by CoinGecko ID or on-chain contract address via GeckoTerminal.

Do NOT use for real-time orderbook -- use dex_analyze_orderbook_depth instead. Do NOT use for swap quotes -- use dex_get_swap_quote instead. Do NOT use for news -- use crypto_get_latest_news instead. Do NOT use for funding rates -- use perp_scan_funding_arbitrage instead.`,
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
      outputSchema: {
          "type": "object",
          "properties": {
            "results": {
              "type": "number",
              "description": "Number of candles"
            },
            "source": {
              "type": "string",
              "description": "Data source"
            },
            "tokenId": {
              "type": "string",
              "description": "Token identifier"
            },
            "interval": {
              "type": "string",
              "description": "Candle interval"
            },
            "candles": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "timestamp": {
                    "type": "number"
                  },
                  "open": {
                    "type": "number"
                  },
                  "high": {
                    "type": "number"
                  },
                  "low": {
                    "type": "number"
                  },
                  "close": {
                    "type": "number"
                  },
                  "volume": {
                    "type": "number"
                  }
                }
              }
            }
          },
          "required": [
            "results",
            "candles"
          ]
        },
    },
  ],
};
