# Orbit — Android TV Remote for Home Assistant

A custom Lovelace card (`orbit-remote-card`) that replaces a physical
Android TV remote inside Home Assistant: trackpad, D-pad, power/home/back,
volume, and one-tap app shortcuts. Works with any box exposed through HA's
`androidtv_remote` integration — Nvidia Shield, Chromecast with Google TV,
and other Android TV devices.

![Card layout mockup: trackpad, D-pad, power/home/back buttons, volume slider, and app shortcut grid](./images/card-preview.svg)

*Layout mockup — not a live screenshot. Trackpad (left), D-pad cluster
(right), power/home/back and volume below, and the app shortcut grid at the
bottom.*

Full design doc: [`shield-ha-remote-spec.md`](./shield-ha-remote-spec.md).

## Requirements

- Home Assistant with the core [`androidtv_remote`](https://www.home-assistant.io/integrations/androidtv_remote/)
  integration configured and paired with your box (exposes a `remote.*`
  entity, and optionally a `media_player.*` entity for volume/playback).

## Development

```bash
npm install
npm run build     # builds dist/orbit-remote-card.js
npm test          # runs the card's unit tests (Vitest)
```

To try the card in a real dashboard, copy `dist/orbit-remote-card.js` into
your HA `config/www/` directory and add it as a Lovelace resource, or install
via HACS (see below).

The `custom_components/orbit/` integration has its own Python test suite,
run against a real Home Assistant core install (not mocks):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-test.txt
python -m pytest tests
```

## Installation via HACS

The card works completely standalone — the steps below are all you need.
The optional companion integration (next section) only adds a setup page
under Settings → Devices & Services; it's never required.

1. In HACS, add this repository as a **custom repository** (category:
   `Dashboard`) — Settings → Custom repositories → paste this repo's URL.
   (Not needed once/if this card is accepted into the HACS default store.)
2. Install "Orbit Remote" from HACS and add the resource it registers.
3. Add the card to a dashboard as `custom:orbit-remote-card` and configure
   `remote_entity` (and optionally `media_player_entity`) via the GUI editor.

Releases are built and published automatically by GitHub Actions: pushing a
`vX.Y.Z` tag builds `dist/orbit-remote-card.js` and attaches it to a GitHub
Release, which is what HACS installs from.

> **Upgrading from Nvidia Shield Remote?** The card type was renamed from
> `shield-remote-card` to `orbit-remote-card`, but `custom:shield-remote-card`
> is kept working permanently as an alias — existing dashboards need no
> changes.

## Optional: the Orbit integration (multi-box setup)

`custom_components/orbit/` is a small, config-only companion integration —
it never touches your boxes directly (the card still talks to them via
`androidtv_remote`'s own entities). All it adds is:

- A proper first-run setup page under **Settings → Devices & Services →
  Add Integration → Orbit**, which discovers your `androidtv_remote` boxes
  and lets you add/rename/remove each one from one place, instead of
  hand-typing entity IDs.
- A "configured boxes" quick-pick in the card's dashboard editor (falls
  back to the plain entity picker if this integration isn't installed).
- An admin-only toggle (on by default) restricting setup/reset to admin
  users — everyone can still use the remote controls either way.
- A factory-reset option (in the integration's options, or the
  `orbit.reset` service) that removes every configured box and clears every
  user's personal card customizations.

Install it the same way as the card, but as a HACS **Integration** (not
Dashboard) custom repository — same repo URL, added a second time under
the Integration category — or copy `custom_components/orbit/` into your
HA `config/custom_components/` directory manually.

## Configuration

The card ships a GUI editor (entities, trackpad sensitivity, haptics, app
shortcuts) — add it via the dashboard UI and configure it without touching
YAML. Equivalent YAML:

```yaml
type: custom:orbit-remote-card
remote_entity: remote.living_room_shield
media_player_entity: media_player.living_room_shield   # optional
trackpad:
  sensitivity: 6
apps:
  - name: YouTube
    icon: mdi:youtube
    package: com.google.android.youtube.tv
```

### Multiple boxes (one card, device switcher)

Provide `boxes` instead of `remote_entity` to get a tab/dropdown switcher
at the top of the card, so one card instance controls several TVs. Each
box keeps its own personal app-shortcut/trackpad overrides. Alternatively,
just add one `orbit-remote-card` per TV (the original, still-supported
model) — both are fully supported and can be mixed across your dashboard.

```yaml
type: custom:orbit-remote-card
boxes:
  - id: living_room
    name: Living Room
    remote_entity: remote.living_room_shield
    media_player_entity: media_player.living_room_shield
  - id: bedroom
    name: Bedroom
    remote_entity: remote.bedroom_box
default_box: living_room   # optional — defaults to the first box
```

## Text input

The button row includes a keyboard icon that opens a small text-input sheet.
Whatever you type is sent as a single `text:<value>` command (the protocol's
IME-injection prefix, §3.3 of the spec) — handy for search boxes and login
forms without hunting-and-pecking with the D-pad. **A text field must already
be focused on the device** (e.g. tap into a search box there first): the
protocol only routes typed text to whatever field the TV itself currently has
active, and silently drops it otherwise.

## Status

Phase 1 (MVP) scaffolded: card shell, config schema, D-pad/button cluster,
gesture-based trackpad, and a default app shortcut grid.

Phase 2 (polish & configurability) complete: GUI config editor for entities,
trackpad sensitivity, haptics, and app shortcuts (add/remove/reorder);
long-press (`hold_secs`) on D-pad-center, Home, and Back; two-finger-tap for
Back on the trackpad; haptic feedback via `forwardHaptic`; a debounced
unavailable state (so brief reconnect blips don't flicker the UI); and a
responsive layout that puts the trackpad and D-pad side-by-side once the
card is wide enough.

Phase 3 (distribution & extras) complete: HACS packaging (`hacs.json`,
this README, MIT `LICENSE`), a GitHub Actions pipeline that builds/tests on
every push and publishes `dist/orbit-remote-card.js` as a release asset on
tagged releases, a `hacs/action` validation workflow, and the text-input
helper described above.

Phase 4 (multi-box + setup) complete: rebranded from Nvidia-Shield-only
naming to Orbit, generalizing support to any `androidtv_remote`-backed
Android TV box (with `custom:shield-remote-card` kept as a permanent
backward-compatible alias); a `boxes`/device-switcher config mode so one
card can control multiple TVs, alongside the original one-card-per-TV
model; a companion `custom_components/orbit` integration providing setup
under Settings → Devices & Services (box discovery, add/rename/remove via
config subentries), an admin-only gate for setup/reset, and a factory-reset
action; and a matching test suite (Vitest for the card, a real
`pytest-homeassistant-custom-component` harness for the integration). See
[`shield-ha-remote-spec.md`](./shield-ha-remote-spec.md) for the original
Phase 1–3 design doc.

See §7 of the spec for the full Phase 1–3 breakdown.
