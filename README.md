# mcp-epa-emissions

EPA Emissions MCP — wraps EPA Envirofacts REST API (free, no auth)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ghg_facility_emissions` | The biggest greenhouse-gas-emitting facilities in a US state (EPA GHGRP), ranked by total CO2-equivalent emissions. Returns each facility's name, location, industry sector(s), and total metric tons CO2e. State-scoped (pass a state). Data lags ~1.5 years — latest full year is auto-selected (currently 2023) unless a `year` is given. |
| `ghg_emissions_by_sector` | Total greenhouse-gas emissions by INDUSTRY SECTOR within a US state (EPA GHGRP) — answers 'which sectors emit the most in <state>'. Sectors: Power Plants, Refineries, Chemicals, Metals, Minerals, Pulp and Paper, Petroleum and Natural Gas Systems, Waste, etc. Returns each sector's total metric tons CO2e and facility count, ranked. State-scoped (pass a state); data lags ~1.5y so the latest full year (~2023) is auto-selected unless `year` is given. |
| `tri_facility_releases` | Search toxic chemical release facilities by state. Returns facility location, type, and chemicals released with quantities in pounds. |
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
ask_pipeworx({ question: "your question about Epa Emissions data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
