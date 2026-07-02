interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Tradier MCP — stock & options market data via the Tradier Brokerage API
 * (tradier.com / developer.tradier.com).
 *
 * Tools:
 * - tradier_option_chain: full option chain (strikes, greeks, IV, open interest)
 * - tradier_option_expirations: available option expiration dates for a symbol
 * - tradier_quote: real-time quotes for one or more symbols
 *
 * Auth: BYO Tradier access token via _apiKey (sent as `Authorization: Bearer`).
 * Get one free with a funded Tradier brokerage account, or use the sandbox.
 * Optional `sandbox` bool switches the base URL to sandbox.tradier.com.
 */


const PROD_BASE = 'https://api.tradier.com/v1';
const SANDBOX_BASE = 'https://sandbox.tradier.com/v1';

const tools: McpToolExport['tools'] = [
  {
    name: 'tradier_option_chain',
    description:
      'Get the option chain (strikes, greeks, IV, open interest) for <symbol> expiring <expiration>. Returns every call and put at that expiration with bid/ask/last, volume, open interest, and greeks (delta/gamma/theta/vega/IV). Example: tradier_option_chain({ symbol: "AAPL", expiration: "2026-01-16", _apiKey: "your-token" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbol: {
          type: 'string',
          description: 'Underlying ticker symbol, e.g. "AAPL", "SPY", "TSLA"',
        },
        expiration: {
          type: 'string',
          description: 'Expiration date in YYYY-MM-DD format, e.g. "2026-01-16" (use tradier_option_expirations to list valid dates)',
        },
        sandbox: {
          type: 'boolean',
          description: 'Use the Tradier sandbox environment (sandbox.tradier.com) instead of production. Default false.',
        },
        _apiKey: {
          type: 'string',
          description: 'Tradier access token (free with a funded Tradier brokerage account, or a sandbox token)',
        },
      },
      required: ['symbol', 'expiration', '_apiKey'],
    },
  },
  {
    name: 'tradier_option_expirations',
    description:
      'List the available option expiration dates for <symbol>. Returns an array of YYYY-MM-DD dates you can pass to tradier_option_chain. Example: tradier_option_expirations({ symbol: "AAPL", _apiKey: "your-token" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbol: {
          type: 'string',
          description: 'Underlying ticker symbol, e.g. "AAPL", "SPY", "TSLA"',
        },
        sandbox: {
          type: 'boolean',
          description: 'Use the Tradier sandbox environment (sandbox.tradier.com) instead of production. Default false.',
        },
        _apiKey: {
          type: 'string',
          description: 'Tradier access token (free with a funded Tradier brokerage account, or a sandbox token)',
        },
      },
      required: ['symbol', '_apiKey'],
    },
  },
  {
    name: 'tradier_quote',
    description:
      'Get real-time quotes for <symbols> (last price, bid, ask, volume, change). Accepts one or more comma-separated tickers. Example: tradier_quote({ symbols: "AAPL,MSFT,SPY", _apiKey: "your-token" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'One or more ticker symbols, comma-separated, e.g. "AAPL" or "AAPL,MSFT,SPY"',
        },
        sandbox: {
          type: 'boolean',
          description: 'Use the Tradier sandbox environment (sandbox.tradier.com) instead of production. Default false.',
        },
        _apiKey: {
          type: 'string',
          description: 'Tradier access token (free with a funded Tradier brokerage account, or a sandbox token)',
        },
      },
      required: ['symbols', '_apiKey'],
    },
  },
];

// Tradier collapses single-element lists into a bare object (e.g. options.option
// is one object for a single-strike expiration, but an array otherwise). Always
// coerce to an array before mapping so downstream code is uniform.
function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function tradierGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  sandbox: boolean,
  tool: string,
): Promise<any> {
  if (!apiKey) {
    throw new Error(
      `${tool} requires a Tradier access token. Pass your token via _apiKey — it's free with a funded Tradier brokerage account (developer.tradier.com), or use a sandbox token with sandbox: true.`,
    );
  }
  const base = sandbox ? SANDBOX_BASE : PROD_BASE;
  const qs = new URLSearchParams(params);
  const res = await fetch(`${base}${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (res.status === 401) {
    throw new Error(
      `Tradier ${tool}: auth failed (HTTP 401). Check your Tradier token — pass a valid access token via _apiKey (production tokens for api.tradier.com, sandbox tokens with sandbox: true).`,
    );
  }
  if (!res.ok) {
    throw new Error(`Tradier ${tool} error: HTTP ${res.status}`);
  }
  return res.json();
}

async function optionChain(args: Record<string, unknown>, apiKey: string, sandbox: boolean) {
  const symbol = args.symbol as string;
  const expiration = args.expiration as string;
  if (!symbol) {
    throw new Error('tradier_option_chain requires a `symbol` (underlying ticker, e.g. "AAPL").');
  }
  if (!expiration) {
    throw new Error(
      'tradier_option_chain requires an `expiration` (YYYY-MM-DD). Use tradier_option_expirations to list valid dates.',
    );
  }

  const data = await tradierGet(
    '/markets/options/chains',
    { symbol, expiration, greeks: 'true' },
    apiKey,
    sandbox,
    'tradier_option_chain',
  );

  const options = toArray<Record<string, any>>(data?.options?.option);
  const chain = options.map((o) => {
    const g = (o.greeks ?? {}) as Record<string, any>;
    return {
      symbol: o.symbol,
      strike: o.strike,
      option_type: o.option_type,
      bid: o.bid,
      ask: o.ask,
      last: o.last,
      volume: o.volume,
      open_interest: o.open_interest,
      expiration_date: o.expiration_date,
      delta: g.delta ?? null,
      gamma: g.gamma ?? null,
      theta: g.theta ?? null,
      vega: g.vega ?? null,
      iv: g.mid_iv ?? null,
    };
  });

  return { symbol, expiration, count: chain.length, options: chain };
}

async function optionExpirations(args: Record<string, unknown>, apiKey: string, sandbox: boolean) {
  const symbol = args.symbol as string;
  if (!symbol) {
    throw new Error('tradier_option_expirations requires a `symbol` (underlying ticker, e.g. "AAPL").');
  }

  const data = await tradierGet(
    '/markets/options/expirations',
    { symbol, includeAllRoots: 'true' },
    apiKey,
    sandbox,
    'tradier_option_expirations',
  );

  const dates = toArray<unknown>(data?.expirations?.date).map((d) => String(d));
  return { symbol, count: dates.length, expirations: dates };
}

async function quote(args: Record<string, unknown>, apiKey: string, sandbox: boolean) {
  const symbols = args.symbols as string;
  if (!symbols) {
    throw new Error(
      'tradier_quote requires `symbols` — one or more comma-separated tickers, e.g. "AAPL" or "AAPL,MSFT,SPY".',
    );
  }

  const data = await tradierGet(
    '/markets/quotes',
    { symbols },
    apiKey,
    sandbox,
    'tradier_quote',
  );

  const quotes = toArray<Record<string, any>>(data?.quotes?.quote).map((q) => ({
    symbol: q.symbol,
    last: q.last,
    bid: q.bid,
    ask: q.ask,
    volume: q.volume,
    change: q.change,
    change_percentage: q.change_percentage,
  }));

  return { count: quotes.length, quotes };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;
  const sandbox = args.sandbox === true;

  switch (name) {
    case 'tradier_option_chain':
      return optionChain(args, apiKey, sandbox);
    case 'tradier_option_expirations':
      return optionExpirations(args, apiKey, sandbox);
    case 'tradier_quote':
      return quote(args, apiKey, sandbox);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
