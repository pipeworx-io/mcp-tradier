# mcp-tradier

Tradier MCP — stock & options market data via the Tradier Brokerage API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/tradier/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Tradier data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
