# mcp-epa-emissions

EPA Emissions MCP — wraps EPA Envirofacts REST API (free, no auth)

Part of the [Pipeworx](https://pipeworx.io) open MCP gateway.

## Tools

| Tool | Description |
|------|-------------|

## Quick Start

Add to your MCP client config:

```json
{
  "mcpServers": {
    "epa-emissions": {
      "url": "https://gateway.pipeworx.io/epa-emissions/mcp"
    }
  }
}
```

Or use the CLI:

```bash
npx pipeworx use epa-emissions
```

## License

MIT
