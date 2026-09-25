# mcp-epa-emissions

EPA Emissions MCP — wraps EPA Envirofacts REST API (free, no auth)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ghg_facility_emissions` | The biggest greenhouse-gas-emitting facilities in a US state (EPA GHGRP), ranked by total CO2-equivalent emissions. Returns each facility's name, location, industry sector(s), and total metric tons CO2e. State-scoped (pass a state). Data lags ~1.5 years — latest full year is auto-selected (currently 2023) unless a `year` is given. |
| `ghg_emissions_by_sector` | Total greenhouse-gas emissions by INDUSTRY SECTOR within a US state (EPA GHGRP) — answers 'which sectors emit the most in <state>'. Sectors: Power Plants, Refineries, Chemicals, Metals, Minerals, Pulp and Paper, Petroleum and Natural Gas Systems, Waste, etc. Returns each sector's total metric tons CO2e and facility count, ranked. State-scoped (pass a state); data lags ~1.5y so the latest full year (~2023) is auto-selected unless `year` is given. |
| `tri_facility_releases` | Search EPA TRI toxic chemical release facilities by state, and optionally by COUNTY — "what toxic releases are reported in Harris County, Texas" is the shape these questions usually take. Returns facility location, county, type, and chemicals released with quantities in pounds. |
| `tri_chemical_releases` | Track toxic chemical releases by chemical name and state. Returns quantities released to air, water, and land broken down by year. |
| `tri_trends` | Analyze toxic release trends over time by state or chemical. Returns historical release data across years to identify patterns and changes. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "epa-emissions": {
      "url": "https://gateway.pipeworx.io/epa-emissions/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/epa-emissions/mcp` returns the tools in the table
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

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/ghg_facility_emissions \
  -H 'Content-Type: application/json' \
  -d '{"state":"Texas"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/ghg_facility_emissions`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "epa-emissions": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-epa-emissions"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-epa-emissions
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Epa Emissions data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
