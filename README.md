# Token OHLCV History API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://token-ohlcv.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Historical OHLCV candles for any token -- daily, 4h, 1h intervals. CoinGecko + GeckoTerminal powered. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "token-ohlcv": {
      "url": "https://token-ohlcv.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://token-ohlcv.api.klymax402.com/api/candles"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `token_get_ohlcv_history` | GET | `/api/candles` | $0.005 | Get historical OHLCV candles for any token by ID or contract address |
| `token_get_ohlcv_history` | POST | `/api/candles` | $0.005 | Get historical OHLCV candles for any token by ID or contract address (POST variant) |

### `token_get_ohlcv_history`

Use this when you need historical price candlestick data for any token. Returns OHLCV candles in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | no | CoinGecko token ID (e.g. bitcoin, ethereum, solana). Use this OR contract+chain. |
| `contract` | string | no | On-chain contract address (e.g. 0x...). Use with chain parameter for GeckoTerminal lookup. |
| `chain` | string | no | Blockchain network for contract lookup: base, ethereum, solana, arbitrum, polygon, optimism, bsc. |
| `days` | number | no | Number of days of history (default 30, max 365). For 1h interval max 2 days, for 4h max 90 days. |
| `interval` | string | no | Candle interval: daily (default), 4h (if days <= 90), 1h (if days <= 2). |

**Returns**

- `candles` -- array of candlestick objects with timestamp, open, high, low, close, volume
- `token` -- token identifier used
- `interval` -- candle interval (daily, 4h, 1h)
- `days` -- number of days of history returned
- `source` -- data source (CoinGecko or GeckoTerminal)

Example response:

```json
{"candles":[{"timestamp":1712966400,"open":3105.20,"high":3142.80,"low":3089.50,"close":3128.60,"volume":1250000000}],"token":"ethereum","interval":"daily","days":30,"source":"CoinGecko"}
```

**When to use**: technical analysis, backtesting, trend detection, and charting. Supports 10,000+ tokens by CoinGecko ID or on-chain contract address via GeckoTerminal.

**Not for**: swap quotes (use `dex_get_swap_quote`), news (use `crypto_get_latest_news`), funding rates (use `perp_scan_funding_arbitrage`).

### `token_get_ohlcv_history`

Use this when you need historical price candlestick data for any token. Returns OHLCV candles in JSON. POST variant of token_get_ohlcv_history -- same params passed as JSON body instead of query string.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `token` | string | no | CoinGecko token ID (e.g. bitcoin, ethereum, solana). Use this OR contract+chain. |
| `contract` | string | no | On-chain contract address (e.g. 0x...). Use with chain parameter for GeckoTerminal lookup. |
| `chain` | string | no | Blockchain network for contract lookup: base, ethereum, solana, arbitrum, polygon, optimism, bsc. |
| `days` | number | no | Number of days of history (default 30, max 365). For 1h interval max 2 days, for 4h max 90 days. |
| `interval` | string | no | Candle interval: daily (default), 4h (if days <= 90), 1h (if days <= 2). |

**Returns**

- `candles` -- array of candlestick objects with timestamp, open, high, low, close, volume
- `token` -- token identifier used
- `interval` -- candle interval (daily, 4h, 1h)
- `days` -- number of days of history returned
- `source` -- data source (CoinGecko or GeckoTerminal)

Example response:

```json
{"candles":[{"timestamp":1712966400,"open":3105.20,"high":3142.80,"low":3089.50,"close":3128.60,"volume":1250000000}],"token":"ethereum","interval":"daily","days":30,"source":"CoinGecko"}
```

**When to use**: technical analysis, backtesting, trend detection, and charting. Supports 10,000+ tokens by CoinGecko ID or on-chain contract address via GeckoTerminal.

**Not for**: swap quotes (use `dex_get_swap_quote`), news (use `crypto_get_latest_news`), funding rates (use `perp_scan_funding_arbitrage`).

## Example agent prompts

- "Historical price candlestick data for any token"
- "Historical price candlestick data for any token"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
