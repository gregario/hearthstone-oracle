# hearthstone-oracle

MCP server for Hearthstone card data, strategy coaching, and deck analysis.

## Stack Profiles

- MCP stack profile: `../../stacks/mcp/`
- TypeScript stack profile: `../../stacks/typescript/`

Read both stack profiles before writing any code.

## Architecture

- **Runtime data**: Downloads HearthstoneJSON card data on first run, stores in `~/.hearthstone-oracle/`
- **Does NOT bundle card data** in the npm package — data is fetched at runtime
- **Updates**: Checks HearthstoneJSON for newer builds, downloads only if newer
- **Storage**: SQLite via `better-sqlite3` with FTS5 full-text search
- **Two layers**: Layer 1 (card data from HearthstoneJSON) + Layer 2 (curated strategy knowledge)

## Data Source

HearthstoneJSON (hearthstonejson.com) — HearthSim community project. Unrestricted use. Auto-extracted from game files.

## Engineering

Uses Superpowers for engineering execution. Follow TDD workflow: write tests first, then implement.

## Important

- All logging via `console.error()` — never `console.log()` (corrupts stdio JSON-RPC)
- In-memory database for tests: `getDatabase(':memory:')`
- Run `/mcp-qa` before every commit — no exceptions
