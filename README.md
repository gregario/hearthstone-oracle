<!-- mcp-name: io.github.gregario/hearthstone-oracle -->

<p align="center">
  <a href="https://www.npmjs.com/package/hearthstone-oracle"><img src="https://img.shields.io/npm/v/hearthstone-oracle.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/hearthstone-oracle"><img src="https://img.shields.io/npm/dm/hearthstone-oracle.svg" alt="npm downloads"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js 18+"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-purple.svg" alt="MCP Compatible"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/sponsors/gregario"><img src="https://img.shields.io/badge/sponsor-♥-ea4aaa.svg" alt="Sponsor"></a>
  <a href="https://glama.ai/mcp/servers/gregario/hearthstone-oracle"><img src="https://glama.ai/mcp/servers/gregario/hearthstone-oracle/badges/score.svg" alt="hearthstone-oracle MCP server"></a>
</p>

# hearthstone-oracle

Hearthstone MCP server with card search, deck analysis, and strategy coaching. Gives LLMs access to every Hearthstone card plus built-in strategy knowledge for deck building and gameplay advice.

## Features

- **Complete card database** from HearthstoneJSON — every collectible card, auto-updated
- **Deck decoding and analysis** — paste a deck code, get full card list, mana curve, and archetype breakdown
- **Strategy knowledge** — archetypes, class identities, matchup dynamics, and game concepts
- **9 MCP tools** — search, lookup, decode, analyze, coach

## Quick Start

```bash
claude mcp add hearthstone-oracle -- npx -y hearthstone-oracle
```

Card data is downloaded automatically from HearthstoneJSON on first run and stored locally in `~/.hearthstone-oracle/`. No API key required.

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hearthstone-oracle": {
      "command": "npx",
      "args": ["-y", "hearthstone-oracle"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_cards` | Search cards by name, text, class, cost, type, rarity, set, or keyword |
| `get_card` | Get complete details for a specific card with fuzzy matching |
| `get_keyword` | Look up keyword/mechanic definitions with related cards |
| `decode_deck` | Decode a deck code into full card list with mana curve |
| `analyze_deck` | Analyze a deck's archetype, gameplan, strengths, and matchup profile |
| `get_archetype` | Learn about deck archetypes (aggro, control, combo, midrange, tempo, value) |
| `get_class_identity` | Strategic identity of each Hearthstone class |
| `get_matchup` | Theoretical matchup dynamics between archetypes |
| `explain_concept` | Fundamental game concepts explained for Hearthstone |

## How It Works

Two-layer architecture:

1. **Card data layer** — Full card database from HearthstoneJSON, stored in a local SQLite database with FTS5 full-text search. Cards are fetched on first run and updated when newer game builds are available.
2. **Strategy layer** — Built-in strategy knowledge covering archetypes, class identities, matchup theory, and core game concepts. Enables the server to provide coaching and analysis, not just raw card data.

## Data Source

Card data provided by [HearthstoneJSON](https://hearthstonejson.com) by [HearthSim](https://hearthsim.info). Auto-extracted from game files. Unrestricted use.

## License

MIT
