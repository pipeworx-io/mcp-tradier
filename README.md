# mcp-tradier

Tradier MCP — stock & options market data via the Tradier Brokerage API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `tradier_option_chain` | Get the option chain (strikes, greeks, IV, open interest) for <symbol> expiring <expiration>. Returns every call and put at that expiration with bid/ask/last, volume, open interest, and greeks (delta/gamma/theta/vega/IV). Example: tradier_option_chain({ symbol: "AAPL", expiration: "2026-01-16", _apiKey: "your-token" }) |
| `tradier_option_expirations` | List the available option expiration dates for <symbol>. Returns an array of YYYY-MM-DD dates you can pass to tradier_option_chain. Example: tradier_option_expirations({ symbol: "AAPL", _apiKey: "your-token" }) |
| `tradier_quote` | Get real-time quotes for <symbols> (last price, bid, ask, volume, change). Accepts one or more comma-separated tickers. Example: tradier_quote({ symbols: "AAPL,MSFT,SPY", _apiKey: "your-token" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "tradier": {
      "url": "https://gateway.pipeworx.io/tradier/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Tradier data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
