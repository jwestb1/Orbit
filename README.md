# Orbit — Nvidia Shield Remote for Home Assistant

A custom Lovelace card (`shield-remote-card`) that replaces a physical Nvidia
Shield TV remote inside Home Assistant: trackpad, D-pad, power/home/back,
volume, and one-tap app shortcuts.

Full design doc: [`shield-ha-remote-spec.md`](./shield-ha-remote-spec.md).

## Requirements

- Home Assistant with the core [`androidtv_remote`](https://www.home-assistant.io/integrations/androidtv_remote/)
  integration configured and paired with your Shield (exposes a `remote.*`
  entity, and optionally a `media_player.*` entity for volume/playback).

## Development

```bash
npm install
npm run build     # builds dist/shield-remote-card.js
npm test          # runs the unit tests (Vitest)
```

To try the card in a real dashboard, copy `dist/shield-remote-card.js` into
your HA `config/www/` directory and add it as a Lovelace resource, or install
via HACS once published.

## Configuration

```yaml
type: custom:shield-remote-card
remote_entity: remote.living_room_shield
media_player_entity: media_player.living_room_shield   # optional
trackpad:
  sensitivity: 6
apps:
  - name: YouTube
    icon: mdi:youtube
    package: com.google.android.youtube.tv
```

## Status

Phase 1 (MVP) scaffolded: card shell, config schema, D-pad/button cluster,
gesture-based trackpad, and a default app shortcut grid — see §7 of the spec
for the full phase breakdown.
