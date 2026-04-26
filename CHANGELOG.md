# Changelog

All notable changes to hearthstone-oracle will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.1

### Fixed
- **Data freshness:** `decode_deck` was returning "Unknown Card" placeholders for valid
  deckstrings because cached HearthstoneJSON snapshots went stale silently. The pipeline
  now refreshes when the local snapshot is older than 7 days (TTL via `isStale()`), and
  the on-disk `last_update.json` timestamp is honoured rather than just written.
- **Fallback message:** unknown dbfIds in `decode_deck` output now surface a clearer
  placeholder — naming the dbfId, flagging the likely cause (recent expansion), and
  pointing the user at a data refresh — instead of a bare "Unknown Card (12345)".

### Changed
- **Test fixtures:** refreshed legacy dbfIds to match the current HearthstoneJSON snapshot
  (Reno Jackson `27228 → 2883`, Tirion Fordring `391 → 890`, Stonetusk Boar `604 → 648`).
  Fireball (`315`) and Fiery War Axe (`401`) remained stable. The legacy Tirion id `391`
  now resolves to Perdition's Blade — a real example of dbfId drift.

### Documented
- **CLAUDE.md:** captured the HearthstoneJSON dbfId-drift gotcha — what it is, why it
  happens, what the pipeline already does about it (TTL refresh + decode_deck fallback),
  and what users should expect from older deckstrings. Future bug triage starts here.

### Tests
- Added `isStale()` boundary tests (no timestamp, unparseable, fresh, stale, custom
  threshold) and decode_deck fallback message tests. Total: 117 passing (was 111).

## 0.1.0

- Initial release.
